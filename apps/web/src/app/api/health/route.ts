import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 * Endpoint diagnostico di collaudo e prontezza produzione (Readiness Check v2):
 * 1. Verifica connessione reale a Supabase e presenza delle colonne migrate su `public.profiles`.
 * 2. Invoca realmente la funzione RPC atomica `public.consume_ai_quota` in modalità dry-run (`p_user_id: null`).
 * 3. Invoca realmente la funzione RPC atomica `public.claim_stripe_webhook_event` in modalità dry-run/probe
 *    e verifica anche le colonne `status, locked_at` sulla tabella `stripe_webhook_events`.
 * 4. Verifica non solo la presenza delle variabili Stripe, ma esegue una chiamata autenticata
 *    alle API Stripe (`stripe.products.list({ limit: 1 })`) per certificare che `STRIPE_SECRET_KEY`
 *    sia valida e funzionante (distinguendo Test Mode da Live Mode).
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; mode?: string; detail: string }> = {
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
    stripe_api_connection: {
      ok: false,
      detail: 'Non verificato',
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

  // 1. PROBLEMA B — Verifica reale della validità delle credenziali Stripe e comunicazione API
  const stripeKey = process.env.STRIPE_SECRET_KEY || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  const stripeMode = stripeKey.startsWith('sk_live_')
    ? 'live'
    : stripeKey.startsWith('sk_test_')
    ? 'test'
    : 'unconfigured';

  if (!stripe || !stripeKey) {
    checks.stripe_api_connection = {
      ok: false,
      mode: 'unconfigured',
      detail: 'STRIPE_SECRET_KEY mancante nelle variabili ambiente',
    };
  } else if (!webhookSecret || !webhookSecret.startsWith('whsec_')) {
    checks.stripe_api_connection = {
      ok: false,
      mode: stripeMode,
      detail: 'STRIPE_SECRET_KEY presente, ma STRIPE_WEBHOOK_SECRET mancante o non valida (deve iniziare con whsec_)',
    };
  } else {
    try {
      await stripe.products.list({ limit: 1 });
      checks.stripe_api_connection = {
        ok: true,
        mode: stripeMode,
        detail: `Connessione API Stripe autenticata con successo (${stripeMode.toUpperCase()} MODE) e STRIPE_WEBHOOK_SECRET configurata`,
      };
    } catch (e) {
      checks.stripe_api_connection = {
        ok: false,
        mode: stripeMode,
        detail: `Credenziali Stripe rifiutate o errore di rete: ${
          e instanceof Error ? e.message : 'errore sconosciuto'
        }`,
      };
    }
  }

  // 2. Verifica raggiungibilità DB e colonne migrate su public.profiles
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
      detail: `Database Supabase non raggiungibile: ${
        e instanceof Error ? e.message : 'errore di rete'
      }`,
    };
  }

  // 3. Verifica esecuzione reale RPC atomica consume_ai_quota (dry-run con p_user_id: null)
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
          detail: 'RPC atomica consume_ai_quota invocata ed operativa',
        };
      } else {
        checks.rpc_consume_ai_quota = {
          ok: false,
          detail: error
            ? `RPC consume_ai_quota non disponibile (${error.code}): ${error.message}`
            : 'Risposta inattesa dalla RPC consume_ai_quota',
        };
      }
    }
  } catch (e) {
    checks.rpc_consume_ai_quota = {
      ok: false,
      detail: e instanceof Error ? e.message : 'Errore invocazione consume_ai_quota',
    };
  }

  // 4. PROBLEMA A — Verifica esecuzione reale della RPC atomica claim_stripe_webhook_event + schema tabella
  try {
    const { error: tableErr } = await supabaseAdmin
      .from('stripe_webhook_events')
      .select('event_id, status, locked_at')
      .limit(1);

    if (tableErr) {
      checks.rpc_claim_stripe_webhook = {
        ok: false,
        detail: `Tabella stripe_webhook_events non pronta (${tableErr.code}): ${tableErr.message}`,
      };
    } else if (typeof supabaseAdmin.rpc === 'function') {
      // Invoca realmente la funzione RPC claim_stripe_webhook_event con p_event_id = '' (dry-run senza scrittura)
      const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc(
        'claim_stripe_webhook_event',
        {
          p_event_id: '',
          p_event_type: 'healthcheck.probe',
          p_lock_timeout_seconds: 300,
        }
      );

      if (!rpcErr && rpcData && typeof rpcData === 'object') {
        // Se la funzione ha già il ramo HEALTHCHECK_OK non scrive nulla; se fosse la versione precedente, pulisce la riga ''
        if ((rpcData as { action?: string }).action !== 'HEALTHCHECK_OK') {
          await supabaseAdmin.from('stripe_webhook_events').delete().eq('event_id', '');
        }
        checks.rpc_claim_stripe_webhook = {
          ok: true,
          detail: 'RPC atomica claim_stripe_webhook_event invocata ed operativa',
        };
      } else {
        checks.rpc_claim_stripe_webhook = {
          ok: false,
          detail: rpcErr
            ? `RPC claim_stripe_webhook_event non trovata o in errore (${rpcErr.code}): ${rpcErr.message}`
            : 'Risposta inattesa dalla RPC claim_stripe_webhook_event',
        };
      }
    }
  } catch (e) {
    checks.rpc_claim_stripe_webhook = {
      ok: false,
      detail: e instanceof Error ? e.message : 'Errore verifica claim_stripe_webhook_event',
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
