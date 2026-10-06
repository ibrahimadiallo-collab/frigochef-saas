import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { jsonError } from '@/lib/api';

export const dynamic = 'force-dynamic';

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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
    if (userId) {
      const { error } = await admin
        .from('profiles')
        .update({ is_pro: true, stripe_customer_id: customerId })
        .eq('id', userId);
      if (error) {
        console.error('[stripe-webhook] profile update failed', error);
        return jsonError('Could not update subscription.', 500);
      }
    }
  }

  return NextResponse.json({ received: true });
}
