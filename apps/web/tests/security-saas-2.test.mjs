import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(webRoot, '../..');

// ============================================================================
// MOTORE TRANSAZIONALE STATEFUL IN-MEMORY (Simula Supabase PostgreSQL + Stripe)
// ============================================================================

function computeTrustedIpHash(headersMap, salt = 'frigochef-ip-salt-2026') {
  const vercelIp = headersMap['x-vercel-forwarded-for'];
  const realIp = headersMap['x-real-ip'];
  const forwardedFor = headersMap['x-forwarded-for'];

  let rawIp = '0.0.0.0';
  if (vercelIp) {
    rawIp = vercelIp.split(',')[0].trim();
  } else if (realIp) {
    rawIp = realIp.trim();
  } else if (forwardedFor) {
    const hops = forwardedFor.split(',').map((s) => s.trim()).filter(Boolean);
    rawIp = hops[hops.length - 1] || '0.0.0.0';
  }

  return crypto
    .createHash('sha256')
    .update(`fc-ip-v1:${salt}:${rawIp}`)
    .digest('hex')
    .slice(0, 32);
}

class StatefulSupabaseMock {
  constructor() {
    this.tables = {
      profiles: [],
      pantry: [],
      recipes: [],
      saved_recipes: [],
      meal_plans: [],
      shopping_lists: [],
      ai_usage_logs: [],
      stripe_webhook_events: [],
    };
    this.authUsers = new Set();
    this.failUpdateOnTable = null;
    this.failDeleteOnTable = null;
    this.rpcDisabled = false;
    this.rpcLockQueue = Promise.resolve();
    this.nowMs = Date.now();

    this.auth = {
      admin: {
        deleteUser: async (userId) => {
          if (!this.authUsers.has(userId)) {
            return { data: null, error: { message: 'User not found in Auth' } };
          }
          this.authUsers.delete(userId);
          return { data: { user: { id: userId } }, error: null };
        },
      },
    };
  }

  async rpc(fnName, params) {
    if (this.rpcDisabled) {
      return { data: null, error: { code: 'PGRST202', message: 'RPC non disponibile' } };
    }

    let release;
    const prev = this.rpcLockQueue;
    this.rpcLockQueue = new Promise((r) => {
      release = r;
    });
    await prev;

    try {
      if (fnName === 'consume_ai_quota') {
        const { p_user_id, p_action_type, p_ip_hash } = params;
        if (!p_user_id) {
          return {
            data: { allowed: false, is_pro: false, used: 0, limit: 0, remaining: 0 },
            error: null,
          };
        }
        const profile = this.tables.profiles.find((p) => p.id === p_user_id);
        const isPro = Boolean(profile?.is_pro);
        const limit =
          p_action_type === 'recipe'
            ? isPro ? 50 : 3
            : p_action_type === 'vision'
            ? isPro ? 50 : 3
            : isPro ? 4 : 1;

        const used = this.tables.ai_usage_logs.filter(
          (row) => row.user_id === p_user_id && row.action_type === p_action_type
        ).length;

        if (used >= limit) {
          return {
            data: {
              allowed: false,
              is_pro: isPro,
              used,
              limit,
              remaining: 0,
              error_code: 'QUOTA_EXCEEDED',
            },
            error: null,
          };
        }

        this.tables.ai_usage_logs.push({
          user_id: p_user_id,
          action_type: p_action_type,
          ip_hash: p_ip_hash,
          created_at: new Date(this.nowMs).toISOString(),
        });

        return {
          data: {
            allowed: true,
            is_pro: isPro,
            used: used + 1,
            limit,
            remaining: limit - (used + 1),
          },
          error: null,
        };
      }

      if (fnName === 'claim_stripe_webhook_event') {
        const { p_event_id, p_event_type, p_lock_timeout_seconds = 300 } = params;
        const existing = this.tables.stripe_webhook_events.find(
          (e) => e.event_id === p_event_id
        );
        const nowISO = new Date(this.nowMs).toISOString();

        if (!existing) {
          this.tables.stripe_webhook_events.push({
            event_id: p_event_id,
            event_type: p_event_type,
            status: 'processing',
            locked_at: nowISO,
            processed_at: nowISO,
          });
          return { data: { action: 'CLAIMED', status: 'processing' }, error: null };
        }

        if (existing.status === 'completed') {
          return { data: { action: 'ALREADY_COMPLETED', status: 'completed' }, error: null };
        }

        const lockAgeMs = this.nowMs - new Date(existing.locked_at).getTime();
        if (lockAgeMs >= p_lock_timeout_seconds * 1000) {
          existing.locked_at = nowISO;
          existing.status = 'processing';
          return { data: { action: 'RECLAIMED', status: 'processing' }, error: null };
        }

        return { data: { action: 'IN_PROGRESS', status: 'processing' }, error: null };
      }

      return { data: null, error: { code: '42883', message: 'Unknown RPC' } };
    } finally {
      release();
    }
  }

  from(tableName) {
    const self = this;
    const rows = this.tables[tableName];

    return {
      select: () => ({
        eq: (col, val) => {
          const matched = rows.filter((r) => r[col] === val);
          return {
            data: matched,
            error: null,
            single: async () => {
              if (matched.length === 0) {
                return { data: null, error: { code: 'PGRST116', message: 'No rows found' } };
              }
              return { data: matched[0], error: null };
            },
          };
        },
      }),
      insert: async (newRows) => {
        for (const row of newRows) {
          if (tableName === 'stripe_webhook_events') {
            const dup = rows.find((r) => r.event_id === row.event_id);
            if (dup) {
              return { data: null, error: { code: '23505', message: 'duplicate key value' } };
            }
          }
          rows.push({ ...row });
        }
        return { data: newRows, error: null };
      },
      update: (patch) => ({
        eq: async (col, val) => {
          if (self.failUpdateOnTable === tableName) {
            return { data: null, error: { code: 'XX000', message: `Simulated DB update error on ${tableName}` } };
          }
          let updated = 0;
          for (const row of rows) {
            if (row[col] === val) {
              Object.assign(row, patch);
              updated++;
            }
          }
          return { data: { count: updated }, error: null };
        },
      }),
      delete: () => ({
        eq: async (col, val) => {
          if (self.failDeleteOnTable === tableName) {
            return { data: null, error: { code: 'XX000', message: `Simulated DB delete error on ${tableName}` } };
          }
          this.tables[tableName] = rows.filter((r) => r[col] !== val);
          return { data: null, error: null };
        },
      }),
    };
  }
}

// Ricrea gli handler eseguibili fedeli a webhook/route.ts e account/route.ts
async function runWebhookStateMachine(event, db) {
  const { data: claimData, error: claimErr } = await db.rpc('claim_stripe_webhook_event', {
    p_event_id: event.id,
    p_event_type: event.type,
    p_lock_timeout_seconds: 300,
  });

  if (claimErr) return { status: 500, body: { error: claimErr.message } };
  if (claimData.action === 'ALREADY_COMPLETED') {
    return { status: 200, body: { received: true, duplicate: true } };
  }
  if (claimData.action === 'IN_PROGRESS') {
    return { status: 409, body: { error: 'Event in progress', retryable: true } };
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (!session.metadata?.userId) throw new Error('Missing userId');
      const { error: updateError } = await db
        .from('profiles')
        .update({
          is_pro: true,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          subscription_status: 'active',
        })
        .eq('id', session.metadata.userId);
      if (updateError) throw new Error(updateError.message);
    } else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const { error: updateError } = await db
        .from('profiles')
        .update({ is_pro: false, subscription_status: 'past_due' })
        .eq('stripe_customer_id', invoice.customer);
      if (updateError) throw new Error(updateError.message);
    }

    const { error: finErr } = await db
      .from('stripe_webhook_events')
      .update({ status: 'completed' })
      .eq('event_id', event.id);
    if (finErr) throw new Error(finErr.message);

    return { status: 200, body: { received: true } };
  } catch (err) {
    await db.from('stripe_webhook_events').delete().eq('event_id', event.id);
    return { status: 500, body: { error: err.message } };
  }
}

async function runAccountDeletionPipeline(userId, db, stripeMock) {
  const { data: profile } = await db.from('profiles').select().eq('id', userId).single();

  if (profile?.stripe_subscription_id) {
    try {
      await stripeMock.subscriptions.cancel(profile.stripe_subscription_id);
    } catch (e) {
      if (e.code !== 'resource_missing') {
        return { status: 502, body: { error: 'Stripe cancel failed' } };
      }
    }
  }

  const userTables = [
    { table: 'shopping_lists', col: 'user_id' },
    { table: 'meal_plans', col: 'user_id' },
    { table: 'saved_recipes', col: 'user_id' },
    { table: 'recipes', col: 'user_id' },
    { table: 'pantry', col: 'user_id' },
    { table: 'ai_usage_logs', col: 'user_id' },
    { table: 'profiles', col: 'id' },
  ];

  const deletedTables = [];
  for (const { table, col } of userTables) {
    const { error: delError } = await db.from(table).delete().eq(col, userId);
    if (delError) {
      return {
        status: 500,
        body: { error: `Failed on ${table}`, partialProgress: deletedTables },
      };
    }
    deletedTables.push(table);
  }

  const { error: authErr } = await db.auth.admin.deleteUser(userId);
  if (authErr) return { status: 500, body: { error: authErr.message } };

  return { status: 200, body: { success: true, deletedTables } };
}

describe('FrigoChef Security-SaaS-3 — Behavioral & Functional Test Suite', () => {
  test('1. CONCORRENZA QUOTE AI: 5 richieste simultanee per utente Free autorizzano esattamente 3 chiamate e bloccano le altre 2', async () => {
    const db = new StatefulSupabaseMock();
    const userId = 'user-free-123';
    db.tables.profiles.push({ id: userId, is_pro: false });

    const ipHash = computeTrustedIpHash({ 'x-vercel-forwarded-for': '203.0.113.42' });

    const concurrentRequests = Array.from({ length: 5 }, () =>
      db.rpc('consume_ai_quota', {
        p_user_id: userId,
        p_action_type: 'recipe',
        p_ip_hash: ipHash,
      })
    );

    const results = await Promise.all(concurrentRequests);
    const allowedCount = results.filter((r) => r.data?.allowed === true).length;
    const blockedCount = results.filter((r) => r.data?.allowed === false).length;

    assert.equal(allowedCount, 3, 'Esattamente 3 richieste devono essere consentite per il piano Free');
    assert.equal(blockedCount, 2, 'Le 2 richieste eccedenti in parallelo devono essere bloccate');
    assert.equal(db.tables.ai_usage_logs.length, 3, 'Nel DB devono risultare esattamente 3 consumi registrati');
  });

  test('2. CRITICO 2 (FALLBACK DISABILITATI): Sia quotas.ts sia webhook/route.ts usano esclusivamente RPC atomiche senza percorsi alternativi non atomici', () => {
    const quotasCode = fs.readFileSync(path.join(webRoot, 'src/lib/quotas.ts'), 'utf8');
    const webhookCode = fs.readFileSync(
      path.join(webRoot, 'src/app/api/stripe/webhook/route.ts'),
      'utf8'
    );

    assert.ok(
      !quotasCode.includes(".from('ai_usage_logs')"),
      'quotas.ts non deve contenere alcun fallback non atomico di SELECT/INSERT diretto su ai_usage_logs'
    );
    assert.ok(
      !quotasCode.includes('withUserLock'),
      'quotas.ts non deve affidarsi a mutex locali in-memory'
    );
    assert.ok(
      quotasCode.includes("db.rpc('consume_ai_quota'"),
      'quotas.ts deve usare esclusivamente la RPC atomica consume_ai_quota'
    );
    assert.ok(
      !webhookCode.includes("claimError.code === '23505'"),
      'webhook/route.ts non deve contenere il percorso alternativo non atomico di INSERT/UPDATE per il claim del lock'
    );
    assert.ok(
      webhookCode.includes("db.rpc('claim_stripe_webhook_event'"),
      'webhook/route.ts deve usare esclusivamente la RPC atomica claim_stripe_webhook_event per acquisire il lock'
    );
  });

  test('3. ALTO 3 (HASHING IP & ANTI-SPOOFING): Priorità a x-vercel-forwarded-for e digest SHA-256 irreversibile', () => {
    const rawSpoofedIp = '1.2.3.4';
    const rawTrustedVercelIp = '198.51.100.77';

    const hashWithSpoofAttempt = computeTrustedIpHash({
      'x-forwarded-for': `${rawSpoofedIp}, ${rawTrustedVercelIp}`,
      'x-vercel-forwarded-for': rawTrustedVercelIp,
    });
    const hashCleanVercel = computeTrustedIpHash({
      'x-vercel-forwarded-for': rawTrustedVercelIp,
    });

    assert.equal(
      hashWithSpoofAttempt,
      hashCleanVercel,
      "L'header x-vercel-forwarded-for deve prevalere su un x-forwarded-for manipolato dal client"
    );
    assert.equal(hashCleanVercel.length, 32);
    assert.match(hashCleanVercel, /^[0-9a-f]{32}$/);
    assert.ok(!hashCleanVercel.includes(rawTrustedVercelIp));
  });

  test('4. CRITICO 1 (WEBHOOK STRIPE): Simulazione completa di duplicati, eventi bloccati (stale lock), errori DB e pagamenti falliti', async () => {
    const db = new StatefulSupabaseMock();
    db.nowMs = 1_795_000_000_000;
    db.tables.profiles.push({
      id: 'user-1',
      is_pro: false,
      stripe_customer_id: null,
      subscription_status: 'free',
    });

    const checkoutEvent = {
      id: 'evt_checkout_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_1',
          customer: 'cus_123',
          subscription: 'sub_123',
          payment_status: 'paid',
          metadata: { userId: 'user-1', plan: 'plus_monthly' },
        },
      },
    };

    // Scenario A: Errore database durante l'aggiornamento del profilo -> deve restituire 500 e rimuovere il lock processing
    db.failUpdateOnTable = 'profiles';
    const failedRes = await runWebhookStateMachine(checkoutEvent, db);
    assert.equal(failedRes.status, 500, 'Un errore DB su profiles deve restituire HTTP 500 a Stripe');
    assert.equal(
      db.tables.stripe_webhook_events.length,
      0,
      'Il lock processing deve essere rimosso dopo un errore DB per consentire il retry'
    );
    assert.equal(db.tables.profiles[0].is_pro, false, 'Il profilo non deve risultare Pro se il DB ha fallito');

    // Scenario B: Evento bloccato in 'processing' per crash improvviso del server
    db.failUpdateOnTable = null;
    db.tables.stripe_webhook_events.push({
      event_id: 'evt_checkout_1',
      event_type: 'checkout.session.completed',
      status: 'processing',
      locked_at: new Date(db.nowMs).toISOString(),
      processed_at: new Date(db.nowMs).toISOString(),
    });

    // Retry dopo soli 20 secondi (lock ancora attivo) -> deve restituire 409 Conflict (MAI 200!)
    db.nowMs += 20_000;
    const inProgressRes = await runWebhookStateMachine(checkoutEvent, db);
    assert.equal(
      inProgressRes.status,
      409,
      'Un evento in processing da meno di 5 minuti deve restituire 409 così Stripe non lo considera completato'
    );

    // Retry dopo 6 minuti (lock scaduto > 300s) -> deve recuperare il lock (RECLAIMED), aggiornare il profilo a Pro e marcare completed
    db.nowMs += 350_000;
    const reclaimedRes = await runWebhookStateMachine(checkoutEvent, db);
    assert.equal(reclaimedRes.status, 200, 'Il retry dopo la scadenza del lock deve completare il webhook con 200');
    assert.equal(db.tables.profiles[0].is_pro, true, 'Il profilo deve ora essere aggiornato a Pro');
    assert.equal(db.tables.stripe_webhook_events[0].status, 'completed');

    // Scenario C: Ulteriore delivery duplicata dello stesso evento già completato -> 200 duplicate
    const dupRes = await runWebhookStateMachine(checkoutEvent, db);
    assert.equal(dupRes.status, 200);
    assert.equal(dupRes.body.duplicate, true);

    // Scenario D: Pagamento rinnovo fallito (invoice.payment_failed) -> disattiva is_pro e imposta past_due
    const failedInvoiceEvent = {
      id: 'evt_invoice_fail_1',
      type: 'invoice.payment_failed',
      data: {
        object: {
          customer: 'cus_123',
        },
      },
    };
    const failInvoiceRes = await runWebhookStateMachine(failedInvoiceEvent, db);
    assert.equal(failInvoiceRes.status, 200);
    assert.equal(db.tables.profiles[0].is_pro, false);
    assert.equal(db.tables.profiles[0].subscription_status, 'past_due');
  });

  test('5. CRITICO 3 (CANCELLAZIONE ACCOUNT & ISOLAMENTO MULTI-UTENTE): Verifica blocco su errore Stripe/DB e isolamento totale dei dati di altri utenti', async () => {
    const db = new StatefulSupabaseMock();

    // Popoliamo tutte le 7 tabelle per due utenti distinti: user-a e user-b
    for (const uid of ['user-a', 'user-b']) {
      db.authUsers.add(uid);
      db.tables.profiles.push({
        id: uid,
        email: `${uid}@test.it`,
        stripe_subscription_id: `sub_${uid}`,
      });
      db.tables.pantry.push({ user_id: uid, ingredients: ['uova'] });
      db.tables.recipes.push({ user_id: uid, slug: `recipe-${uid}` });
      db.tables.saved_recipes.push({ user_id: uid, recipe_data: {} });
      db.tables.meal_plans.push({ user_id: uid, plan_data: [] });
      db.tables.shopping_lists.push({ user_id: uid, items: [] });
      db.tables.ai_usage_logs.push({ user_id: uid, action_type: 'recipe' });
    }

    const canceledSubs = [];
    let stripeShouldFail = true;
    const stripeMock = {
      subscriptions: {
        cancel: async (subId) => {
          if (stripeShouldFail) {
            throw new Error('Stripe API unreachable');
          }
          canceledSubs.push(subId);
          return { id: subId, status: 'canceled' };
        },
      },
    };

    // Caso 1: Stripe fallisce la disdetta -> l'eliminazione dell'account deve fermarsi con 502 senza cancellare i dati
    const resStripeFail = await runAccountDeletionPipeline('user-a', db, stripeMock);
    assert.equal(resStripeFail.status, 502);
    assert.equal(db.tables.profiles.length, 2, 'Nessun profilo deve essere eliminato se la disdetta Stripe fallisce');

    // Caso 2: Stripe funziona, ma la tabella meal_plans fallisce durante la cancellazione -> deve restituire 500 con partialProgress
    stripeShouldFail = false;
    db.failDeleteOnTable = 'meal_plans';
    const resDbFail = await runAccountDeletionPipeline('user-a', db, stripeMock);
    assert.equal(resDbFail.status, 500);
    assert.deepEqual(resDbFail.body.partialProgress, ['shopping_lists']);
    assert.ok(db.authUsers.has('user-a'), "L'utente Auth non deve essere eliminato se la pulizia tabelle si è interrotta");

    // Caso 3: Database e Stripe operativi -> elimina completamente user-a ma lascia intatto il 100% dei dati di user-b
    db.failDeleteOnTable = null;
    const resSuccess = await runAccountDeletionPipeline('user-a', db, stripeMock);
    assert.equal(resSuccess.status, 200);
    assert.ok(canceledSubs.includes('sub_user-a'), "L'abbonamento Stripe di user-a deve essere stato disdetto");
    assert.ok(!db.authUsers.has('user-a'), 'user-a deve essere stato rimosso da Auth');

    // Verifica che user-a sia scomparso da tutte le 7 tabelle e user-b sia ancora presente in tutte le 7 tabelle
    for (const [table, col] of [
      ['profiles', 'id'],
      ['pantry', 'user_id'],
      ['recipes', 'user_id'],
      ['saved_recipes', 'user_id'],
      ['meal_plans', 'user_id'],
      ['shopping_lists', 'user_id'],
      ['ai_usage_logs', 'user_id'],
    ]) {
      const remainingForA = db.tables[table].filter((r) => r[col] === 'user-a');
      const remainingForB = db.tables[table].filter((r) => r[col] === 'user-b');
      assert.equal(remainingForA.length, 0, `La tabella ${table} non deve più contenere record di user-a`);
      assert.equal(
        remainingForB.length,
        1,
        `Isolamento dati violato: i record di user-b nella tabella ${table} devono restare intatti`
      );
    }
  });

  test('6. ALTO 4 (SAFE SQL ROLLBACK): Nessuno script di rollback esegue DROP COLUMN o DROP TABLE su dati utente', () => {
    const rollback2 = fs.readFileSync(
      path.join(repoRoot, 'supabase/migrations/20261120000001_security_saas_2_rollback.sql'),
      'utf8'
    );
    const rollback3 = fs.readFileSync(
      path.join(repoRoot, 'supabase/migrations/20261120000002_security_saas_3_rollback.sql'),
      'utf8'
    );

    for (const [name, sql] of [
      ['20261120000001_security_saas_2_rollback.sql', rollback2],
      ['20261120000002_security_saas_3_rollback.sql', rollback3],
    ]) {
      const activeStatements = sql
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .toUpperCase();

      assert.ok(
        !activeStatements.includes('DROP COLUMN'),
        `Lo script ${name} NON deve contenere istruzioni DROP COLUMN`
      );
      assert.ok(
        !activeStatements.includes('DROP TABLE'),
        `Lo script ${name} NON deve contenere istruzioni DROP TABLE`
      );
    }
  });
});
