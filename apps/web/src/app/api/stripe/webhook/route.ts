import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

// Durata massima del lock 'processing' prima che un evento venga considerato bloccato (5 minuti)
export const WEBHOOK_LOCK_TIMEOUT_SECONDS = 300;

/**
 * CRITICO 1 — Gestore atomico dell'evento Stripe con recupero degli eventi bloccati (stale lock recovery):
 * - 'ALREADY_COMPLETED' -> 200 { received: true, duplicate: true }
 * - 'IN_PROGRESS' (lock attivo < 5 min) -> 409 Conflict (Stripe riproverà se la prima istanza dovesse fallire)
 * - 'CLAIMED' o 'RECLAIMED' (lock scaduto >= 5 min) -> Elabora l'evento, verifica ogni errore DB e marca 'completed'
 */
export async function processStripeWebhookEvent(
  event: Stripe.Event,
  db: typeof supabaseAdmin = supabaseAdmin,
  nowMs: number = Date.now()
): Promise<{ status: number; body: Record<string, unknown> }> {
  const nowISO = new Date(nowMs).toISOString();
  let lockAcquired = false;

  // 1. Tentativo primario: funzione RPC atomica PostgreSQL `claim_stripe_webhook_event`
  if (typeof db.rpc === 'function') {
    const { data: rpcClaim, error: rpcError } = await db.rpc('claim_stripe_webhook_event', {
      p_event_id: event.id,
      p_event_type: event.type,
      p_lock_timeout_seconds: WEBHOOK_LOCK_TIMEOUT_SECONDS,
    });

    if (!rpcError && rpcClaim && typeof rpcClaim === 'object') {
      const action = (rpcClaim as { action?: string }).action;
      if (action === 'ALREADY_COMPLETED') {
        return { status: 200, body: { received: true, duplicate: true } };
      }
      if (action === 'IN_PROGRESS') {
        // IMPORTANTE: non restituire 200 per un evento ancora in elaborazione, altrimenti Stripe non riproverà mai se l'altra istanza crasha
        return {
          status: 409,
          body: { error: 'Event is currently being processed by an active worker', retryable: true },
        };
      }
      if (action === 'CLAIMED' || action === 'RECLAIMED') {
        lockAcquired = true;
      }
    } else if (rpcError && rpcError.code !== 'PGRST202' && rpcError.code !== '42883') {
      console.error('Errore RPC claim_stripe_webhook_event:', rpcError);
      return {
        status: 500,
        body: { error: 'Database unavailable for webhook idempotency lock' },
      };
    }
  }

  // 2. Fallback SQL atomico con scadenza del lock (se la RPC non è ancora stata applicata)
  if (!lockAcquired) {
    const { error: claimError } = await db.from('stripe_webhook_events').insert([
      {
        event_id: event.id,
        event_type: event.type,
        status: 'processing',
        locked_at: nowISO,
        processed_at: nowISO,
      },
    ]);

    if (claimError) {
      if (claimError.code === '23505') {
        const { data: existing, error: readErr } = await db
          .from('stripe_webhook_events')
          .select('status, locked_at, processed_at')
          .eq('event_id', event.id)
          .single();

        if (readErr || !existing) {
          return {
            status: 500,
            body: { error: 'Unable to read existing webhook lock state' },
          };
        }

        if (existing.status === 'completed') {
          return { status: 200, body: { received: true, duplicate: true } };
        }

        const lockTimestamp = existing.locked_at || existing.processed_at;
        const lockAgeMs = lockTimestamp ? nowMs - new Date(lockTimestamp).getTime() : Infinity;

        if (lockAgeMs < WEBHOOK_LOCK_TIMEOUT_SECONDS * 1000) {
          return {
            status: 409,
            body: { error: 'Event is currently being processed by an active worker', retryable: true },
          };
        }

        // Lock scaduto (>= 5 minuti): recupera atomicamente l'evento bloccato
        const { error: reclaimError } = await db
          .from('stripe_webhook_events')
          .update({
            status: 'processing',
            locked_at: nowISO,
            processed_at: nowISO,
          })
          .eq('event_id', event.id);

        if (reclaimError) {
          return {
            status: 500,
            body: { error: 'Failed to reclaim stale webhook lock' },
          };
        }
        lockAcquired = true;
      } else {
        console.error('Impossibile registrare lock idempotenza Stripe:', claimError);
        return {
          status: 500,
          body: { error: 'Database unavailable for webhook idempotency check' },
        };
      }
    } else {
      lockAcquired = true;
    }
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
