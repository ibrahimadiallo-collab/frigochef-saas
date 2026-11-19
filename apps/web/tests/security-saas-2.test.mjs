import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(webRoot, '../..');

describe('FrigoChef Security-SaaS-2 — Verification Suite', () => {
  test('1. Autenticazione & Rimozione demo-token (Fase 1.1)', () => {
    const adminFile = fs.readFileSync(
      path.join(webRoot, 'src/lib/supabase-admin.ts'),
      'utf8'
    );
    assert.ok(
      adminFile.includes("token === 'demo-token'"),
      'getUserFromRequest deve rifiutare esplicitamente demo-token'
    );
    assert.ok(
      !adminFile.includes("id: 'demo-user-id'"),
      'Nessun utente fittizio demo-user-id deve esistere in supabase-admin.ts'
    );
  });

  test('2. CRITICO 1 — Quote AI persistenti, atomiche e con autenticazione obbligatoria', () => {
    const quotasFile = fs.readFileSync(
      path.join(webRoot, 'src/lib/quotas.ts'),
      'utf8'
    );
    // Verifica autenticazione obbligatoria (401 se !user)
    assert.ok(
      quotasFile.includes('statusCode: 401'),
      'verifyAndConsumeAIQuota deve restituire 401 per richieste non autenticate'
    );
    // Verifica assenza di contatori volatili in-memory (memoryQuotaStore rimosso)
    assert.ok(
      !quotasFile.includes('memoryQuotaStore'),
      'Il contatore volatile memoryQuotaStore deve essere rimosso'
    );
    // Verifica utilizzo della funzione RPC atomica PostgreSQL consume_ai_quota
    assert.ok(
      quotasFile.includes("supabaseAdmin.rpc('consume_ai_quota'"),
      'verifyAndConsumeAIQuota deve invocare la RPC atomica consume_ai_quota'
    );
    // Verifica comportamento fail-closed (503) in caso di errore DB
    assert.ok(
      quotasFile.includes('statusCode: 503'),
      'verifyAndConsumeAIQuota deve fallire in modo sicuro (fail-closed 503) se il DB fallisce'
    );
  });

  test('3. CRITICO 2 — Webhook Stripe: controllo errori Supabase e rollback idempotenza', () => {
    const webhookFile = fs.readFileSync(
      path.join(webRoot, 'src/app/api/stripe/webhook/route.ts'),
      'utf8'
    );

    // Verifica claim atomico iniziale con status: processing
    assert.ok(
      webhookFile.includes("status: 'processing'"),
      'Il webhook deve registrare inizialmente lo stato processing'
    );
    // Verifica gestione unique_violation 23505
    assert.ok(
      webhookFile.includes("claimError.code === '23505'"),
      'Il webhook deve gestire il codice PostgreSQL 23505 per idempotenza atomica'
    );
    // Verifica controllo esplicito di updateError in tutti i 5 eventi Stripe
    const errorChecks = webhookFile.match(/if \(updateError\)/g) || [];
    assert.ok(
      errorChecks.length >= 5,
      `Ogni ramo di aggiornamento Supabase nel webhook deve verificare if (updateError) (trovati: ${errorChecks.length})`
    );
    // Verifica finalizzazione in status: completed solo a fine switch
    assert.ok(
      webhookFile.includes("status: 'completed'"),
      'Il webhook deve marcare completed solo dopo il successo di tutte le query'
    );
    // Verifica rollback del record processing nel catch
    assert.ok(
      webhookFile.includes(".from('stripe_webhook_events')") &&
        webhookFile.includes('.delete()'),
      'Il webhook deve rimuovere il lock processing in caso di errore per permettere il retry di Stripe'
    );
  });

  test('4. CRITICO 3 & ALTO 4 — Cancellazione Account coordinata + Esportazione completa GDPR', () => {
    const accountFile = fs.readFileSync(
      path.join(webRoot, 'src/app/api/account/route.ts'),
      'utf8'
    );

    // Nessun uso di Promise.allSettled che ignora errori
    assert.ok(
      !accountFile.includes('Promise.allSettled'),
      'DELETE /api/account non deve usare Promise.allSettled ignorando gli errori'
    );

    // Verifica cancellazione abbonamento Stripe attivo prima dell'eliminazione
    assert.ok(
      accountFile.includes('stripe.subscriptions.cancel'),
      'DELETE /api/account deve annullare eventuali abbonamenti Stripe attivi'
    );

    // Verifica presenza di meal_plans e shopping_lists sia in export (GET) sia in delete (DELETE)
    for (const table of [
      'shopping_lists',
      'meal_plans',
      'saved_recipes',
      'recipes',
      'pantry',
      'ai_usage_logs',
      'profiles',
    ]) {
      assert.ok(
        accountFile.includes(`'${table}'`),
        `La tabella ${table} deve essere gestita esplicitamente in /api/account`
      );
    }

    // Verifica campi di esportazione GDPR completi
    assert.ok(
      accountFile.includes('mealPlans:') &&
        accountFile.includes('shoppingLists:') &&
        accountFile.includes('aiUsageLogs:'),
      'GET /api/account?export=true deve esportare anche mealPlans, shoppingLists e aiUsageLogs'
    );
  });

  test('5. ALTO 5 — Migrazione SQL versionata con ALTER TABLE e procedura di rollback', () => {
    const migrationPath = path.join(
      repoRoot,
      'supabase/migrations/20261120000001_security_saas_2.sql'
    );
    const rollbackPath = path.join(
      repoRoot,
      'supabase/migrations/20261120000001_security_saas_2_rollback.sql'
    );

    assert.ok(fs.existsSync(migrationPath), 'Il file di migrazione SQL deve esistere');
    assert.ok(fs.existsSync(rollbackPath), 'Il file di rollback SQL deve esistere');

    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(
      migrationSql.includes('ALTER TABLE public.profiles') &&
        migrationSql.includes('ADD COLUMN IF NOT EXISTS stripe_subscription_id'),
      'La migrazione deve usare ALTER TABLE ... ADD COLUMN IF NOT EXISTS su profiles'
    );
    assert.ok(
      migrationSql.includes('pg_advisory_xact_lock'),
      'La funzione consume_ai_quota deve utilizzare pg_advisory_xact_lock per atomicità'
    );
    assert.ok(
      migrationSql.includes('REVOKE EXECUTE ON FUNCTION public.consume_ai_quota'),
      'La funzione consume_ai_quota non deve essere invocabile direttamente da anon/authenticated'
    );
  });

  test('6. ALTO 6 — Gestione errori HTTP nel salvataggio preferenze profilo', () => {
    const profilePage = fs.readFileSync(
      path.join(webRoot, 'src/app/profile/page.tsx'),
      'utf8'
    );

    assert.ok(
      profilePage.includes('if (!res.ok)'),
      'La pagina profilo deve verificare if (!res.ok) prima di confermare il salvataggio delle preferenze'
    );
  });
});
