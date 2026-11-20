import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

// Durata massima del lock 'processing' prima che un evento venga considerato bloccato (5 minuti)
export const WEBHOOK_LOCK_TIMEOUT_SECONDS = 300;

/**
 * Gestore atomico dell'evento Stripe con recupero degli eventi bloccati (stale lock recovery):
 * - Utilizza ESCLUSIVAMENTE la funzione RPC atomica PostgreSQL `public.claim_stripe_webhook_event`
 *   (protetta da `pg_advisory_xact_lock`), eliminando qualsiasi percorso alternativo non atomico.
 * - 'ALREADY_COMPLETED' -> 200 { received: true, duplicate: true }
 * - 'IN_PROGRESS' (lock attivo < 5 min) -> 409 Conflict (Stripe riproverà se la prima istanza dovesse fallire)
 * - 'CLAIMED' o 'RECLAIMED' (lock scaduto >= 5 min) -> Elabora l'evento, verifica ogni errore DB e marca 'completed'
 * - Se la RPC non è disponibile o restituisce errore -> fail-closed 500 (Stripe riproverà senza rischio di race condition)
 */
export async function processStripeWebhookEvent(
  event: Stripe.Event,
  db: typeof supabaseAdmin = supabaseAdmin,
  nowMs: number = Date.now()
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (typeof db.rpc !== 'function') {
    return {
      status: 500,
      body: { error: 'Webhook idempotency RPC not configured on database client' },
    };
  }

  // 1. Acquisizione / Recupero ATOMICO tramite RPC PostgreSQL `claim_stripe_webhook_event`
  const { data: rpcClaim, error: rpcError } = await db.rpc('claim_stripe_webhook_event', {
    p_event_id: event.id,
    p_event_type: event.type,
    p_lock_timeout_seconds: WEBHOOK_LOCK_TIMEOUT_SECONDS,
  });

  if (rpcError || !rpcClaim || typeof rpcClaim !== 'object') {
    console.error('Errore RPC atomica claim_stripe_webhook_event:', rpcError);
    return {
      status: 500,
      body: { error: 'Database unavailable for atomic webhook idempotency lock' },
    };
  }

  const action = (rpcClaim as { action?: string }).action;
  if (action === 'ALREADY_COMPLETED') {
    return { status: 200, body: { received: true, duplicate: true } };
  }
  if (action === 'IN_PROGRESS') {
    return {
      status: 409,
      body: { error: 'Event is currently being processed by an active worker', retryable: true },
    };
  }
  if (action !== 'CLAIMED' && action !== 'RECLAIMED') {
    return {
      status: 500,
      body: { error: `Unexpected webhook lock state: ${String(action)}` },
    };
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan || 'plus_monthly';

        const paymentVerified =
          session.payment_status === 'paid' || session.payment_status === 'no_payment_required';

        if (!userId) {
          throw new Error(`checkout.session.completed privo di metadata.userId (session: ${session.id})`);
        }

        if (paymentVerified) {
          const { error: updateError } = await db
            .from('profiles')
            .update({
              is_pro: true,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: (session.subscription as string) || null,
              subscription_status:
                session.payment_status === 'no_payment_required' ? 'trialing' : 'active',
              subscription_plan: plan,
              trial_used: true,
            })
            .eq('id', userId);

          if (updateError) {
            throw new Error(`Errore aggiornamento profilo su checkout.session.completed: ${updateError.message}`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const isActive = ['active', 'trialing'].includes(subscription.status);
        const rawPeriodEnd = (subscription as unknown as { current_period_end?: number })
          .current_period_end;
        const periodEnd = rawPeriodEnd
          ? new Date(rawPeriodEnd * 1000).toISOString()
          : null;

        const { error: updateError } = await db
          .from('profiles')
          .update({
            is_pro: isActive,
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status,
            subscription_period_end: periodEnd,
            trial_used: true,
          })
          .eq('stripe_customer_id', customerId);

        if (updateError) {
          throw new Error(`Errore aggiornamento profilo su customer.subscription.updated: ${updateError.message}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { error: updateError } = await db
          .from('profiles')
          .update({
            is_pro: false,
            subscription_status: 'canceled',
            subscription_plan: 'free',
          })
          .eq('stripe_customer_id', customerId);

        if (updateError) {
          throw new Error(`Errore aggiornamento profilo su customer.subscription.deleted: ${updateError.message}`);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        if (customerId) {
          const { error: updateError } = await db
            .from('profiles')
            .update({
              is_pro: true,
              subscription_status: 'active',
            })
            .eq('stripe_customer_id', customerId);

          if (updateError) {
            throw new Error(`Errore aggiornamento profilo su invoice.paid: ${updateError.message}`);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        if (customerId) {
          const { error: updateError } = await db
            .from('profiles')
            .update({
              is_pro: false,
              subscription_status: 'past_due',
            })
            .eq('stripe_customer_id', customerId);

          if (updateError) {
            throw new Error(`Errore aggiornamento profilo su invoice.payment_failed: ${updateError.message}`);
          }
        }
        break;
      }
    }

    const { error: finalizeError } = await db
      .from('stripe_webhook_events')
      .update({
        status: 'completed',
        processed_at: new Date(nowMs).toISOString(),
      })
      .eq('event_id', event.id);

    if (finalizeError) {
      throw new Error(`Impossibile finalizzare evento webhook ${event.id}: ${finalizeError.message}`);
    }

    return { status: 200, body: { received: true } };
  } catch (err) {
    console.error(`Error processing Stripe webhook ${event.type} (${event.id}):`, err);

    await db
      .from('stripe_webhook_events')
      .delete()
      .eq('event_id', event.id);

    return {
      status: 500,
      body: { error: err instanceof Error ? err.message : 'Webhook processing failed' },
    };
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!stripe || !signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Stripe non configurato o firma webhook mancante' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const result = await processStripeWebhookEvent(event, supabaseAdmin);
  return NextResponse.json(result.body, { status: result.status });
}
