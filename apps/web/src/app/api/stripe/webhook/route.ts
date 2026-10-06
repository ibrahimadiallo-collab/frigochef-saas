import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { jsonError } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Dopo questo numero di tentativi di pagamento falliti il Pro viene revocato. */
const MAX_PAYMENT_ATTEMPTS = 3;

type ProfilePatch = Partial<{
  is_pro: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  pro_expires_at: string | null;
}>;

function idOf(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null;
  return typeof ref === 'string' ? ref : ref.id;
}

/** Fine del periodo di fatturazione corrente (nelle API recenti è sui subscription item). */
function periodEnd(sub: Stripe.Subscription): string | null {
  const ends = sub.items.data.map((item) => item.current_period_end).filter((n): n is number => typeof n === 'number');
  return ends.length ? new Date(Math.max(...ends) * 1000).toISOString() : null;
}

async function updateByCustomer(admin: SupabaseClient, customerId: string, patch: ProfilePatch) {
  const { error } = await admin.from('profiles').update(patch).eq('stripe_customer_id', customerId);
  if (error) throw error;
}

async function handleEvent(admin: SupabaseClient, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId) return;
      const { error } = await admin
        .from('profiles')
        .update({
          is_pro: true,
          stripe_customer_id: idOf(session.customer),
          stripe_subscription_id: idOf(session.subscription),
        } satisfies ProfilePatch)
        .eq('id', userId);
      if (error) throw error;
      return;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = idOf(sub.customer);
      if (!customerId) return;
      const isActive = sub.status === 'active' || sub.status === 'trialing';
      await updateByCustomer(admin, customerId, {
        is_pro: isActive,
        stripe_subscription_id: sub.id,
        pro_expires_at: periodEnd(sub),
      });
      return;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = idOf(sub.customer);
      if (!customerId) return;
      await updateByCustomer(admin, customerId, {
        is_pro: false,
        stripe_subscription_id: null,
        pro_expires_at: new Date().toISOString(),
      });
      return;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = idOf(invoice.customer);
      console.warn('[stripe-webhook] payment failed', { customerId, attempt: invoice.attempt_count, invoice: invoice.id });
      if (customerId && (invoice.attempt_count ?? 0) >= MAX_PAYMENT_ATTEMPTS) {
        await updateByCustomer(admin, customerId, { is_pro: false, pro_expires_at: new Date().toISOString() });
      }
      return;
    }

    default:
      return;
  }
}

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const admin = getSupabaseAdmin();
  if (!stripe || !secret || !admin) return jsonError('Payments are not configured.', 503);
  if (!signature) return jsonError('Missing signature.', 400);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed', err);
    return jsonError('Invalid signature.', 400);
  }

  try {
    await handleEvent(admin, event);
  } catch (err) {
    // 500 → Stripe ritenterà la consegna dell'evento.
    console.error(`[stripe-webhook] ${event.type} handling failed`, err);
    return jsonError('Could not update subscription.', 500);
  }

  return NextResponse.json({ received: true });
}
