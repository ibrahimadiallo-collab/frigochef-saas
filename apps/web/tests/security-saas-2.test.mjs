import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');
const srcRoot = path.resolve(webRoot, 'src');
const repoRoot = path.resolve(webRoot, '../..');

// Loader nativo Node 24 per risolvere alias `@/*` e import relativi TypeScript senza estensione
if (typeof Module.registerHooks === 'function') {
  Module.registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier.startsWith('@/')) {
        const target = path.join(srcRoot, specifier.slice(2));
        for (const ext of ['', '.ts', '.tsx', '/index.ts']) {
          if (fs.existsSync(target + ext) && fs.statSync(target + ext).isFile()) {
            return nextResolve(pathToFileURL(target + ext).href, context);
          }
        }
      }
      if (
        (specifier.startsWith('./') || specifier.startsWith('../')) &&
        context.parentURL &&
        !path.extname(specifier)
      ) {
        const parentDir = path.dirname(fileURLToPath(context.parentURL));
        const target = path.resolve(parentDir, specifier);
        for (const ext of ['.ts', '.tsx', '/index.ts']) {
          if (fs.existsSync(target + ext) && fs.statSync(target + ext).isFile()) {
            return nextResolve(pathToFileURL(target + ext).href, context);
          }
        }
      }
      return nextResolve(specifier, context);
    },
  });
}

// ============================================================================
// IMPORTAZIONE DIRETTA DEI MODULI DI PRODUZIONE REALI (Passo 7)
// ============================================================================
const {
  arePaymentsEnabled,
  getConfiguredStripePriceId,
  resolveSafeAppOrigin,
} = await import('../src/lib/billing.ts');

const {
  getTrustedClientIpHash,
  resolveIpHmacSecret,
  checkRateLimit,
} = await import('../src/lib/rate-limit.ts');

const { verifyAndConsumeAIQuota } = await import('../src/lib/quotas.ts');
const { processStripeWebhookEvent } = await import('../src/lib/stripe-webhook.ts');
const { executeAccountExport, executeAccountDeletion } = await import('../src/lib/account.ts');

// ============================================================================
// MOCK DATABASE STATEFUL IN-MEMORY INIETTATO NELLE FUNZIONI DI PRODUZIONE REALI
// ============================================================================
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
            data: {
              allowed: false,
              is_pro: false,
              used: 0,
              limit: 0,
              remaining: 0,
              error_code: 'UNAUTHENTICATED',
            },
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
        if (!p_event_id || p_event_id.trim() === '') {
          return { data: { action: 'HEALTHCHECK_OK', status: 'ready' }, error: null };
        }

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
        limit: async (n) => ({ data: rows.slice(0, n), error: null }),
      }),
      insert: async (newRows) => {
        for (const row of newRows) {
          rows.push({ ...row });
        }
        return { data: newRows, error: null };
      },
      update: (patch) => ({
        eq: async (col, val) => {
          if (this.failUpdateOnTable === tableName) {
            return {
              data: null,
              error: { code: 'XX000', message: `Simulated DB update error on ${tableName}` },
            };
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
          if (this.failDeleteOnTable === tableName) {
            return {
              data: null,
              error: { code: 'XX000', message: `Simulated DB delete error on ${tableName}` },
            };
          }
          this.tables[tableName] = rows.filter((r) => r[col] !== val);
          return { data: null, error: null };
        },
      }),
    };
  }
}

describe('FrigoChef Security-SaaS-4 — Real Production Code Execution Test Suite', () => {
  test('1. BILLING KILL-SWITCH (src/lib/billing.ts): PAYMENTS_ENABLED=false di default e rifiuto prezzi non configurati', () => {
    assert.equal(arePaymentsEnabled({}), false, 'Di default i pagamenti devono essere disabilitati');
    assert.equal(arePaymentsEnabled({ PAYMENTS_ENABLED: 'false' }), false);
    assert.equal(arePaymentsEnabled({ PAYMENTS_ENABLED: 'true' }), true);

    assert.equal(getConfiguredStripePriceId('monthly', {}), null);
    assert.equal(
      getConfiguredStripePriceId('monthly', { STRIPE_PRICE_MONTHLY_ID: 'price_placeholder' }),
      null
    );
    assert.equal(
      getConfiguredStripePriceId('monthly', { STRIPE_PRICE_MONTHLY_ID: 'price_1RealMonthly' }),
      'price_1RealMonthly'
    );
    assert.equal(
      getConfiguredStripePriceId('annual', { STRIPE_PRICE_ANNUAL_ID: 'price_1RealAnnual' }),
      'price_1RealAnnual'
    );

    const req = new Request('https://preview-frigochef.vercel.app/api/stripe/checkout');
    assert.equal(resolveSafeAppOrigin(req, {}), 'https://preview-frigochef.vercel.app');
  });

  test('2. QUOTE AI ATOMICHE & CONCORRENZA (src/lib/quotas.ts): Esecuzione reale di verifyAndConsumeAIQuota con 5 richieste simultanee e fail-closed 503', async () => {
    const db = new StatefulSupabaseMock();
    const userId = 'user-free-real-1';
    db.tables.profiles.push({ id: userId, is_pro: false });

    const makeReq = (auth = true) =>
      new Request('https://frigochef.it/api/recipe', {
        method: 'POST',
        headers: auth
          ? {
              authorization: 'Bearer valid-jwt-token-123456789012345',
              'x-vercel-forwarded-for': '203.0.113.42',
            }
          : { 'x-vercel-forwarded-for': '203.0.113.42' },
      });

    // A) Richiesta senza autenticazione -> 401
    const unauthRes = await verifyAndConsumeAIQuota(makeReq(false), 'recipe', {
      getUser: async () => null,
      db,
    });
    assert.equal(unauthRes.allowed, false);
    assert.equal(unauthRes.statusCode, 401);

    // B) 5 richieste concorrenti con utente Free (limite 3/giorno) -> 3 passano (200), 2 bloccate (429)
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        verifyAndConsumeAIQuota(makeReq(true), 'recipe', {
          getUser: async () => ({ id: userId, email: 'free@test.it' }),
          db,
        })
      )
    );

    const allowed = results.filter((r) => r.allowed && r.statusCode === 200);
    const blocked = results.filter((r) => !r.allowed && r.statusCode === 429);
    assert.equal(allowed.length, 3, 'Esattamente 3 chiamate devono essere autorizzate');
    assert.equal(blocked.length, 2, 'Le 2 chiamate concorrenti in eccesso devono ricevere 429');

    // Verifica che l'ip_hash salvato da verifyAndConsumeAIQuota nel DB sia un HMAC-SHA256 a 64 caratteri hex
    const savedIpHash = db.tables.ai_usage_logs[0].ip_hash;
    assert.equal(savedIpHash.length, 64);
    assert.match(savedIpHash, /^[0-9a-f]{64}$/);
    assert.ok(!savedIpHash.includes('203.0.113.42'));

    // C) Se la RPC sul DB non è disponibile -> fail-closed 503 (nessun fallback non atomico)
    db.rpcDisabled = true;
    const failClosedRes = await verifyAndConsumeAIQuota(makeReq(true), 'recipe', {
      getUser: async () => ({ id: userId, email: 'free@test.it' }),
      db,
    });
    assert.equal(failClosedRes.allowed, false);
    assert.equal(failClosedRes.statusCode, 503);
  });

  test('3. HMAC-SHA256 IP HASHING (src/lib/rate-limit.ts): Esecuzione reale di getTrustedClientIpHash e non-collisione su chiavi JWT', () => {
    const reqSpoof = new Request('https://frigochef.it/api/recipe', {
      headers: {
        'x-forwarded-for': '1.2.3.4, 198.51.100.77',
        'x-vercel-forwarded-for': '198.51.100.77',
      },
    });
    const reqTrusted = new Request('https://frigochef.it/api/recipe', {
      headers: {
        'x-vercel-forwarded-for': '198.51.100.77',
      },
    });

    const hashA = getTrustedClientIpHash(reqSpoof, 'secret-key-alpha-1234567890');
    const hashB = getTrustedClientIpHash(reqTrusted, 'secret-key-alpha-1234567890');
    const hashDifferentSecret = getTrustedClientIpHash(reqTrusted, 'secret-key-beta-0987654321');

    assert.equal(hashA, hashB, 'x-vercel-forwarded-for deve prevalere su x-forwarded-for falsificato');
    assert.notEqual(hashB, hashDifferentSecret, 'Segreti HMAC diversi devono produrre digest diversi');
    assert.equal(hashB.length, 64);

    // Verifica che due service role key JWT con gli stessi primi 16 caratteri (eyJhbGciOiJIUzI1) producano chiavi HMAC diverse
    const jwt1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload1.signature_one_abc';
    const jwt2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload2.signature_two_xyz';
    const key1 = resolveIpHmacSecret(undefined, { SUPABASE_SERVICE_ROLE_KEY: jwt1 });
    const key2 = resolveIpHmacSecret(undefined, { SUPABASE_SERVICE_ROLE_KEY: jwt2 });
    assert.notDeepEqual(
      key1,
      key2,
      'Due JWT con lo stesso header di 16 caratteri devono generare chiavi HMAC distinte'
    );

    const rl1 = checkRateLimit(reqTrusted, 'test-bucket', 2, 60_000);
    const rl2 = checkRateLimit(reqTrusted, 'test-bucket', 2, 60_000);
    const rl3 = checkRateLimit(reqTrusted, 'test-bucket', 2, 60_000);
    assert.equal(rl1.allowed, true);
    assert.equal(rl2.allowed, true);
    assert.equal(rl3.allowed, false);
  });

  test('4. WEBHOOK STRIPE REALE (src/lib/stripe-webhook.ts): Esecuzione di processStripeWebhookEvent su 0 righe abbinate, eventi fuori ordine, stale lock e cambio piano', async () => {
    const db = new StatefulSupabaseMock();
    db.nowMs = 1_795_000_000_000;

    db.tables.profiles.push({
      id: 'user-stripe-1',
      is_pro: false,
      stripe_customer_id: null,
      subscription_status: 'free',
      subscription_plan: 'free',
      stripe_last_event_created: 0,
    });

    // A) customer.subscription.updated arriva PRIMA che stripe_customer_id sia salvato (0 righe trovate e nessun metadata.userId)
    // -> Deve fallire con 500 e rimuovere il lock processing, così Stripe riprova dopo checkout.session.completed!
    const orphanUpdateEvent = {
      id: 'evt_orphan_sub_update',
      type: 'customer.subscription.updated',
      created: 1000,
      data: {
        object: {
          id: 'sub_999',
          customer: 'cus_not_linked_yet',
          status: 'active',
          items: { data: [{ current_period_end: 1800000000, price: { recurring: { interval: 'year' } } }] },
        },
      },
    };
    const orphanRes = await processStripeWebhookEvent(orphanUpdateEvent, db, db.nowMs);
    assert.equal(
      orphanRes.status,
      500,
      'Un evento su un customer non ancora associato (0 righe) deve restituire 500 per far riprovare Stripe'
    );
    assert.equal(db.tables.stripe_webhook_events.length, 0);

    // B) checkout.session.completed associa cus_999 a user-stripe-1 (created: 1010)
    const checkoutEvent = {
      id: 'evt_checkout_ok',
      type: 'checkout.session.completed',
      created: 1010,
      data: {
        object: {
          id: 'cs_ok',
          customer: 'cus_999',
          subscription: 'sub_999',
          payment_status: 'paid',
          metadata: { userId: 'user-stripe-1', plan: 'plus_monthly' },
        },
      },
    };
    const checkoutRes = await processStripeWebhookEvent(checkoutEvent, db, db.nowMs);
    assert.equal(checkoutRes.status, 200);
    assert.equal(db.tables.profiles[0].is_pro, true);
    assert.equal(db.tables.profiles[0].stripe_customer_id, 'cus_999');
    assert.equal(db.tables.profiles[0].stripe_last_event_created, 1010);

    // C) customer.subscription.updated con cambio piano ad Annuale e current_period_end dentro items.data[0] (created: 1020)
    const upgradeAnnualEvent = {
      id: 'evt_upgrade_annual',
      type: 'customer.subscription.updated',
      created: 1020,
      data: {
        object: {
          id: 'sub_999',
          customer: 'cus_999',
          status: 'active',
          items: {
            data: [
              {
                current_period_end: 1825000000,
                price: { recurring: { interval: 'year' } },
              },
            ],
          },
        },
      },
    };
    const upgradeRes = await processStripeWebhookEvent(upgradeAnnualEvent, db, db.nowMs);
    assert.equal(upgradeRes.status, 200);
    assert.equal(db.tables.profiles[0].subscription_plan, 'plus_annual');
    assert.equal(
      db.tables.profiles[0].subscription_period_end,
      new Date(1825000000 * 1000).toISOString(),
      'current_period_end deve essere estratto correttamente anche da items.data[0]'
    );

    // D) customer.subscription.deleted (created: 1050) disattiva l'abbonamento
    const deleteSubEvent = {
      id: 'evt_sub_deleted',
      type: 'customer.subscription.deleted',
      created: 1050,
      data: {
        object: {
          id: 'sub_999',
          customer: 'cus_999',
          status: 'canceled',
        },
      },
    };
    const delRes = await processStripeWebhookEvent(deleteSubEvent, db, db.nowMs);
    assert.equal(delRes.status, 200);
    assert.equal(db.tables.profiles[0].is_pro, false);
    assert.equal(db.tables.profiles[0].subscription_status, 'canceled');

    // E) Un vecchio evento invoice.paid fuori ordine (created: 1030 < 1050) arriva in ritardo:
    // NON deve riattivare is_pro=true!
    const staleInvoicePaid = {
      id: 'evt_old_invoice_paid',
      type: 'invoice.paid',
      created: 1030,
      data: {
        object: {
          customer: 'cus_999',
        },
      },
    };
    const staleRes = await processStripeWebhookEvent(staleInvoicePaid, db, db.nowMs);
    assert.equal(staleRes.status, 200);
    assert.equal(
      db.tables.profiles[0].is_pro,
      false,
      'Un evento invoice.paid con timestamp created più vecchio di subscription.deleted non deve riattivare Pro'
    );
  });

  test('5. CANCELLAZIONE & EXPORT GDPR REALI (src/lib/account.ts): Esecuzione di executeAccountDeletion con utenti invitati (referred_by) e isolamento multi-utente', async () => {
    const db = new StatefulSupabaseMock();

    // user-a ha invitato user-b (user-b.referred_by = 'REFA1234')
    db.authUsers.add('user-a');
    db.authUsers.add('user-b');
    db.tables.profiles.push(
      {
        id: 'user-a',
        email: 'a@test.it',
        referral_code: 'REFA1234',
        referred_by: null,
        stripe_customer_id: 'cus_a',
        stripe_subscription_id: 'sub_a',
      },
      {
        id: 'user-b',
        email: 'b@test.it',
        referral_code: 'REFB5678',
        referred_by: 'REFA1234',
        stripe_customer_id: null,
        stripe_subscription_id: null,
      }
    );

    for (const uid of ['user-a', 'user-b']) {
      db.tables.pantry.push({ user_id: uid, ingredients: ['pomodori'] });
      db.tables.recipes.push({ user_id: uid, slug: `s-${uid}` });
      db.tables.saved_recipes.push({ user_id: uid, recipe_data: {} });
      db.tables.meal_plans.push({ user_id: uid, plan_data: [] });
      db.tables.shopping_lists.push({ user_id: uid, items: [] });
      db.tables.ai_usage_logs.push({ user_id: uid, action_type: 'recipe' });
    }

    // A) Verifica executeAccountExport reale su user-b (include referred_by e tutte le 7 sezioni)
    const exportRes = await executeAccountExport('user-b', 'b@test.it', db);
    assert.equal(exportRes.status, 200);
    assert.equal(exportRes.body.profile.referred_by, 'REFA1234');
    assert.equal(exportRes.body.mealPlans.length, 1);
    assert.equal(exportRes.body.shoppingLists.length, 1);

    // B) Verifica executeAccountDeletion reale su user-a (che aveva invitato user-b)
    const canceledSubs = [];
    const stripeMock = {
      subscriptions: {
        cancel: async (subId) => {
          canceledSubs.push(subId);
          return { id: subId, status: 'canceled' };
        },
      },
    };

    const delRes = await executeAccountDeletion('user-a', db, stripeMock);
    assert.equal(delRes.status, 200);
    assert.deepEqual(canceledSubs, ['sub_a']);
    assert.ok(!db.authUsers.has('user-a'));

    // Verifica che user-b abbia ora referred_by = null (scollegato senza errori FK) e tutti i suoi dati intatti
    const profileB = db.tables.profiles.find((p) => p.id === 'user-b');
    assert.ok(profileB, 'Il profilo di user-b deve restare intatto');
    assert.equal(
      profileB.referred_by,
      null,
      'referred_by di user-b deve essere stato scollegato (NULL) alla cancellazione del referrer user-a'
    );
  });

  test('6. MIGRAZIONI SQL, PAGINE LEGALI E CONFIGURAZIONE BUILD: Verifica integrità file P0', () => {
    // Verifica presenza delle 3 pagine legali su disco
    for (const legalPage of [
      'src/app/privacy/page.tsx',
      'src/app/terms/page.tsx',
      'src/app/cookies/page.tsx',
      'src/app/contact/page.tsx',
      'src/app/auth/callback/route.ts',
    ]) {
      assert.ok(
        fs.existsSync(path.join(webRoot, legalPage)),
        `La pagina/route obbligatoria ${legalPage} deve esistere`
      );
    }

    // Verifica che next.config.ts NON contenga ignoreBuildErrors o ignoreDuringBuilds
    const nextConfig = fs.readFileSync(path.join(webRoot, 'next.config.ts'), 'utf8');
    assert.ok(
      !nextConfig.includes('ignoreBuildErrors'),
      'next.config.ts non deve contenere ignoreBuildErrors'
    );
    assert.ok(
      !nextConfig.includes('ignoreDuringBuilds'),
      'next.config.ts non deve contenere ignoreDuringBuilds'
    );

    // Verifica migrazione SQL 20261120000003_security_saas_4.sql
    const mig4 = fs.readFileSync(
      path.join(repoRoot, 'supabase/migrations/20261120000003_security_saas_4.sql'),
      'utf8'
    );
    assert.ok(mig4.includes('ON DELETE SET NULL'));
    assert.ok(mig4.includes('SET search_path = public, pg_temp'));
    assert.ok(mig4.includes('NEW.referred_by IS DISTINCT FROM OLD.referred_by'));
  });
});
