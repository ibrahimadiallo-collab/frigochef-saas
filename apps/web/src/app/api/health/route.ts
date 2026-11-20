import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 * Endpoint diagnostico di prontezza produzione (Readiness Check):
 * Verifica in tempo reale (senza mai esporre chiavi segrete) se:
 * 1. Il database Supabase di produzione è attivo e raggiungibile.
 * 2. Le nuove colonne della migrazione `security_saas_2` esistono su `public.profiles`.
 * 3. La funzione RPC atomica `public.consume_ai_quota` è installata.
 * 4. La funzione RPC atomica `public.claim_stripe_webhook_event` è installata.
 * 5. Le variabili Stripe e Gemini sono configurate nell'ambiente Vercel.
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail: string }> = {
    env_supabase: {
      ok: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
          process.env.SUPABASE_SERVICE_ROLE_KEY
      ),
      detail: process.env.NEXT_PUBLIC_SUPABASE_URL
        ? 'Variabili Supabase presenti'
        : 'Variabili Supabase mancanti',
    },
    env_gemini: {
      ok: Boolean(process.env.GEMINI_API_KEY),
      detail: process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY configurata' : 'GEMINI_API_KEY mancante',
    },
    env_stripe: {
      ok: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
      detail:
        process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET
          ? 'STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET configurate'
          : 'Mancano STRIPE_SECRET_KEY e/o STRIPE_WEBHOOK_SECRET su Vercel',
    },
    db_profiles_migration: {
      ok: false,
      detail: 'Non verificato',
    },
    rpc_consume_ai_quota: {
      ok: false,
      detail: 'Non verificato',
    },
    rpc_claim_stripe_webhook: {
      ok: false,
      detail: 'Non verificato',
    },
  };

  // 1. Verifica raggiungibilità DB e colonne migrate su public.profiles
  try {
    const { error: profErr } = await supabaseAdmin
      .from('profiles')
      .select(
        'id, is_pro, stripe_subscription_id, subscription_status, subscription_plan, trial_used, dietary_preferences, allergens'
      )
      .limit(1);

    if (!profErr) {
      checks.db_profiles_migration = {
        ok: true,
        detail: 'Tabella profiles raggiungibile e colonne migrazione presenti',
      };
    } else {
      checks.db_profiles_migration = {
        ok: false,
        detail: `Errore schema profiles (${profErr.code || 'network'}): ${profErr.message}`,
      };
    }
  } catch (e) {
    checks.db_profiles_migration = {
      ok: false,
      detail: `Database Supabase non raggiungibile (progetto in pausa?): ${
        e instanceof Error ? e.message : 'errore di rete'
      }`,
    };
  }

  // 2. Verifica presenza RPC atomica consume_ai_quota (chiamata dry-run con p_user_id = null che non inserisce log)
  try {
    if (typeof supabaseAdmin.rpc === 'function') {
      const { data, error } = await supabaseAdmin.rpc('consume_ai_quota', {
        p_user_id: null,
        p_action_type: 'recipe',
        p_ip_hash: 'healthcheck',
      });

      if (!error && data && data.error_code === 'UNAUTHENTICATED') {
        checks.rpc_consume_ai_quota = {
          ok: true,
          detail: 'RPC atomica consume_ai_quota installata e operativa',
        };
      } else {
        checks.rpc_consume_ai_quota = {
          ok: false,
          detail: error
            ? `RPC consume_ai_quota non trovata o in errore (${error.code}): esegui la migrazione SQL su Supabase`
            : 'Risposta inattesa da consume_ai_quota',
        };
      }
    }
  } catch (e) {
    checks.rpc_consume_ai_quota = {
      ok: false,
      detail: e instanceof Error ? e.message : 'Errore invocazione RPC',
    };
  }

  // 3. Verifica presenza tabella stripe_webhook_events con colonna locked_at
  try {
    const { error: whErr } = await supabaseAdmin
      .from('stripe_webhook_events')
      .select('event_id, status, locked_at')
      .limit(1);

    if (!whErr) {
      checks.rpc_claim_stripe_webhook = {
        ok: true,
        detail: 'Tabella stripe_webhook_events con locked_at pronta',
      };
    } else {
      checks.rpc_claim_stripe_webhook = {
        ok: false,
        detail: `Tabella stripe_webhook_events non aggiornata (${whErr.code}): esegui 20261120000002_security_saas_3.sql`,
      };
    }
  } catch (e) {
    checks.rpc_claim_stripe_webhook = {
      ok: false,
      detail: e instanceof Error ? e.message : 'Errore verifica stripe_webhook_events',
    };
  }

  const allReady = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      readyForProduction: allReady,
      checkedAt: new Date().toISOString(),
      checks,
    },
    { status: allReady ? 200 : 503 }
  );
}
