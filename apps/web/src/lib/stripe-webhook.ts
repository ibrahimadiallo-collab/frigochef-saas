import { supabaseAdmin } from './supabase-admin';
import Stripe from 'stripe';

export const WEBHOOK_LOCK_TIMEOUT_SECONDS = 300;

interface ProfileRow {
  id: string;
  stripe_last_event_created?: number | null;
}

function extractSubscriptionPeriodEnd(subscription: Stripe.Subscription): string | null {
  const subAny = subscription as unknown as {
    current_period_end?: number;
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  const rawSeconds =
    subAny.current_period_end ?? subAny.items?.data?.[0]?.current_period_end;

  return typeof rawSeconds === 'number' && rawSeconds > 0
    ? new Date(rawSeconds * 1000).toISOString()
    : null;
}

function extractSubscriptionPlan(subscription: Stripe.Subscription, isActive: boolean): string {
  if (!isActive) return 'free';
  if (subscription.metadata?.plan) return subscription.metadata.plan;

  const subAny = subscription as unknown as {
    items?: { data?: Array<{ price?: { recurring?: { interval?: string } } }> };
  };
  const interval = subAny.items?.data?.[0]?.price?.recurring?.interval;
  if (interval === 'year') return 'plus_annual';
  return 'plus_monthly';
}

async function findTargetProfile(
  db: typeof supabaseAdmin,
  customerId: string | null | undefined,
  fallbackUserId?: string | null
): Promise<ProfileRow> {
  if (customerId) {
    const { data, error } = await db
      .from('profiles')
      .select('id, stripe_last_event_created')
      .eq('stripe_customer_id', customerId)
      .single();

    if (!error && data?.id) {
      return data as ProfileRow;
    }
  }

  if (fallbackUserId) {
    const { data, error } = await db
      .from('profiles')
      .select('id, stripe_last_event_created')
      .eq('id', fallbackUserId)
      .single();

    if (!error && data?.id) {
      return data as ProfileRow;
    }
  }

  throw new Error(
    `Nessun profilo trovato per customer=${customerId || 'null'} userId=${fallbackUserId || 'null'} (0 righe abbinate)`
  );
}

/**
 * Passo 5 — Gestore atomico dell'evento Stripe con:
 * 1. Lock atomico tramite RPC `claim_stripe_webhook_event`.
 * 2. Verifica righe abbinate (fallisce con 500 se 0 righe vengono trovate, così Stripe riprova se subscription.updated arriva prima di checkout.session.completed).
 * 3. Protezione ordine eventi tramite `event.created` vs `stripe_last_event_created`.
 * 4. Lettura `current_period_end` sia da `subscription` sia da `items.data[0]`.
 * 5. Aggiornamento di `subscription_plan` sui cambi piano.
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

  const eventCreated = typeof event.created === 'number' ? event.created : 0;

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

        const targetProfile = await findTargetProfile(db, session.customer as string, userId);
        const lastCreated = Number(targetProfile.stripe_last_event_created || 0);

        if (eventCreated > 0 && lastCreated > 0 && eventCreated < lastCreated) {
          break;
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
              stripe_last_event_created: Math.max(eventCreated, lastCreated),
            })
            .eq('id', targetProfile.id);

          if (updateError) {
            throw new Error(`Errore aggiornamento profilo su checkout.session.completed: ${updateError.message}`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const targetProfile = await findTargetProfile(
          db,
          customerId,
          subscription.metadata?.userId
        );
        const lastCreated = Number(targetProfile.stripe_last_event_created || 0);

        if (eventCreated > 0 && lastCreated > 0 && eventCreated < lastCreated) {
          break;
        }

        const isActive = ['active', 'trialing'].includes(subscription.status);
        const periodEnd = extractSubscriptionPeriodEnd(subscription);
        const plan = extractSubscriptionPlan(subscription, isActive);

        const { error: updateError } = await db
          .from('profiles')
          .update({
            is_pro: isActive,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status,
            subscription_plan: plan,
            subscription_period_end: periodEnd,
            trial_used: true,
            stripe_last_event_created: Math.max(eventCreated, lastCreated),
          })
          .eq('id', targetProfile.id);

        if (updateError) {
          throw new Error(`Errore aggiornamento profilo su customer.subscription.updated: ${updateError.message}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const targetProfile = await findTargetProfile(
          db,
          customerId,
          subscription.metadata?.userId
        );
        const lastCreated = Number(targetProfile.stripe_last_event_created || 0);

        if (eventCreated > 0 && lastCreated > 0 && eventCreated < lastCreated) {
          break;
        }

        const { error: updateError } = await db
          .from('profiles')
          .update({
            is_pro: false,
            subscription_status: 'canceled',
            subscription_plan: 'free',
            stripe_last_event_created: Math.max(eventCreated, lastCreated),
          })
          .eq('id', targetProfile.id);

        if (updateError) {
          throw new Error(`Errore aggiornamento profilo su customer.subscription.deleted: ${updateError.message}`);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const targetProfile = await findTargetProfile(db, customerId);
        const lastCreated = Number(targetProfile.stripe_last_event_created || 0);

        if (eventCreated > 0 && lastCreated > 0 && eventCreated < lastCreated) {
          break;
        }

        const { error: updateError } = await db
          .from('profiles')
          .update({
            is_pro: true,
            subscription_status: 'active',
            stripe_last_event_created: Math.max(eventCreated, lastCreated),
          })
          .eq('id', targetProfile.id);

        if (updateError) {
          throw new Error(`Errore aggiornamento profilo su invoice.paid: ${updateError.message}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const targetProfile = await findTargetProfile(db, customerId);
        const lastCreated = Number(targetProfile.stripe_last_event_created || 0);

        if (eventCreated > 0 && lastCreated > 0 && eventCreated < lastCreated) {
          break;
        }

        // Segnala stato past_due mantenendo il periodo di grazia durante i tentativi automatici Stripe
        const { error: updateError } = await db
          .from('profiles')
          .update({
            subscription_status: 'past_due',
            stripe_last_event_created: Math.max(eventCreated, lastCreated),
          })
          .eq('id', targetProfile.id);

        if (updateError) {
          throw new Error(`Errore aggiornamento profilo su invoice.payment_failed: ${updateError.message}`);
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
      body: { error: 'Webhook processing failed' },
    };
  }
}
