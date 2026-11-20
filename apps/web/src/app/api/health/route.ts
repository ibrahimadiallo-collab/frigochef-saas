import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function isAuthorizedDiagnosticsRequest(req: Request): boolean {
  const configuredSecret = process.env.HEALTHCHECK_SECRET?.trim();
  if (!configuredSecret || configuredSecret.length < 16) {
    return false;
  }

  const headerSecret =
    req.headers.get('x-health-secret')?.trim() ||
    (req.headers.get('authorization')?.startsWith('Bearer ')
      ? req.headers.get('authorization')!.slice(7).trim()
      : '');

  if (!headerSecret) return false;

  const bufA = Buffer.from(configuredSecret, 'utf8');
  const bufB = Buffer.from(headerSecret, 'utf8');
  if (bufA.length !== bufB.length) return false;

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * GET /api/health
 * Passo 2 P0 — Endpoint di salute protetto:
 * - In pubblico (senza HEALTHCHECK_SECRET): restituisce SOLO `{ ok: true | false }`,
 *   senza mai chiamare Stripe, senza mai scrivere sul DB e senza mai esporre `e.message`,
 *   nomi di tabelle/colonne o la modalità Stripe (live/test).
 * - Con `x-health-secret` / `Authorization: Bearer <HEALTHCHECK_SECRET>`: esegue la verifica
 *   diagnostica read-only delle RPC per l'operatore.
 */
export async function GET(req: Request) {
  const envOk = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.GEMINI_API_KEY
  );

  const authorized = isAuthorizedDiagnosticsRequest(req);

  // Risposta pubblica minimale: nessuna chiamata a Stripe, nessuna query pesante, nessun dettaglio interno
  if (!authorized) {
    return NextResponse.json({ ok: envOk }, { status: envOk ? 200 : 503 });
  }

  const checks: Record<string, { ok: boolean }> = {
    env_supabase: {
      ok: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
          process.env.SUPABASE_SERVICE_ROLE_KEY
      ),
    },
    env_gemini: {
      ok: Boolean(process.env.GEMINI_API_KEY),
    },
    env_stripe: {
      ok: Boolean(
        process.env.STRIPE_SECRET_KEY &&
          process.env.STRIPE_WEBHOOK_SECRET &&
          process.env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_')
      ),
    },
    db_profiles_migration: { ok: false },
    rpc_consume_ai_quota: { ok: false },
    rpc_claim_stripe_webhook: { ok: false },
  };

  try {
    const { error: profErr } = await supabaseAdmin
      .from('profiles')
      .select(
        'id, is_pro, stripe_subscription_id, subscription_status, subscription_plan, trial_used, dietary_preferences, allergens, stripe_last_event_created'
      )
      .limit(1);
    checks.db_profiles_migration.ok = !profErr;
  } catch {
    checks.db_profiles_migration.ok = false;
  }

  try {
    if (typeof supabaseAdmin.rpc === 'function') {
      const { data, error } = await supabaseAdmin.rpc('consume_ai_quota', {
        p_user_id: null,
        p_action_type: 'recipe',
        p_ip_hash: 'healthcheck',
      });
      checks.rpc_consume_ai_quota.ok = Boolean(
        !error && data && data.error_code === 'UNAUTHENTICATED'
      );
    }
  } catch {
    checks.rpc_consume_ai_quota.ok = false;
  }

  try {
    if (typeof supabaseAdmin.rpc === 'function') {
      const { data, error } = await supabaseAdmin.rpc('claim_stripe_webhook_event', {
        p_event_id: '',
        p_event_type: 'healthcheck.probe',
        p_lock_timeout_seconds: 300,
      });
      checks.rpc_claim_stripe_webhook.ok = Boolean(
        !error && data && (data as { action?: string }).action === 'HEALTHCHECK_OK'
      );
    }
  } catch {
    checks.rpc_claim_stripe_webhook.ok = false;
  }

  const allReady = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      ok: allReady,
      readyForProduction: allReady,
      checks,
    },
    { status: allReady ? 200 : 503 }
  );
}
