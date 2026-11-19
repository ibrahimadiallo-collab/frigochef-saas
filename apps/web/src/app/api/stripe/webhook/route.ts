import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

// Cache in-memory di sicurezza per idempotenza immediata
const processedEventsMemory = new Set<string>();

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

  // 1. Verifica Idempotenza: evita di elaborare due volte lo stesso evento Stripe
  if (processedEventsMemory.has(event.id)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    const { data: existingEvent } = await supabaseAdmin
      .from('stripe_webhook_events')
      .select('event_id')
      .eq('event_id', event.id)
      .single();

    if (existingEvent?.event_id) {
      processedEventsMemory.add(event.id);
      return NextResponse.json({ received: true, duplicate: true });
    }
  } catch {
    // Procede se la tabella non è ancora presente
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan || 'plus_monthly';

        // Attiva solo se il pagamento o l'attivazione prova gratuita è confermata
        const paymentVerified =
          session.payment_status === 'paid' || session.payment_status === 'no_payment_required';

        if (userId && paymentVerified) {
          await supabaseAdmin
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
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const isActive = ['active', 'trialing'].includes(subscription.status);
        const rawPeriodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;
        const periodEnd = rawPeriodEnd
          ? new Date(rawPeriodEnd * 1000).toISOString()
          : null;

        await supabaseAdmin
          .from('profiles')
          .update({
            is_pro: isActive,
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status,
            subscription_period_end: periodEnd,
            trial_used: true,
          })
          .eq('stripe_customer_id', customerId);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabaseAdmin
          .from('profiles')
          .update({
            is_pro: false,
            subscription_status: 'canceled',
            subscription_plan: 'free',
          })
          .eq('stripe_customer_id', customerId);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        if (customerId) {
          await supabaseAdmin
            .from('profiles')
            .update({
              is_pro: true,
              subscription_status: 'active',
            })
            .eq('stripe_customer_id', customerId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        if (customerId) {
          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_status: 'past_due',
            })
            .eq('stripe_customer_id', customerId);
        }
        break;
      }
    }

    // Registra evento elaborato per idempotenza
    processedEventsMemory.add(event.id);
    await supabaseAdmin
      .from('stripe_webhook_events')
      .insert([{ event_id: event.id, event_type: event.type }]);

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`Error processing Stripe webhook ${event.type}:`, err);
    // Restituisce 500 così Stripe può riprovare il webhook in caso di errore temporaneo DB
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
