import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

/**
 * CRITICO 2 — Webhook Stripe con:
 * 1. Idempotenza atomica tramite INSERT su `stripe_webhook_events` (PK `event_id`).
 * 2. Verifica esplicita di `error` su OGNI aggiornamento Supabase (`if (error) throw error`).
 * 3. Rollback del lock `processing` e risposta HTTP 500 in caso di errore DB, così Stripe riprova.
 */
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

  // 1. Acquisizione atomica dell'evento (INSERT su chiave primaria event_id)
  const { error: claimError } = await supabaseAdmin
    .from('stripe_webhook_events')
    .insert([
      {
        event_id: event.id,
        event_type: event.type,
        status: 'processing',
        processed_at: new Date().toISOString(),
      },
    ]);

  if (claimError) {
    // 23505 = unique_violation su PostgreSQL: l'evento è già stato registrato
    if (claimError.code === '23505') {
      const { data: existing } = await supabaseAdmin
        .from('stripe_webhook_events')
        .select('status')
        .eq('event_id', event.id)
        .single();

      if (!existing || existing.status === 'completed' || existing.status === 'processing') {
        return NextResponse.json({ received: true, duplicate: true });
      }
    } else {
      console.error('Impossibile registrare lock idempotenza Stripe:', claimError);
      return NextResponse.json(
        { error: 'Database unavailable for webhook idempotency check' },
        { status: 500 }
      );
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
          const { error: updateError } = await supabaseAdmin
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

        const { error: updateError } = await supabaseAdmin
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

        const { error: updateError } = await supabaseAdmin
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
          const { error: updateError } = await supabaseAdmin
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
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
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

    // 2. Segna l'evento come 'completed' SOLO dopo che l'aggiornamento su Supabase è riuscito senza errori
    const { error: finalizeError } = await supabaseAdmin
      .from('stripe_webhook_events')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('event_id', event.id);

    if (finalizeError) {
      throw new Error(`Impossibile finalizzare evento webhook ${event.id}: ${finalizeError.message}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`Error processing Stripe webhook ${event.type} (${event.id}):`, err);

    // Rollback del record 'processing' così Stripe può riprovare l'evento
    await supabaseAdmin
      .from('stripe_webhook_events')
      .delete()
      .eq('event_id', event.id);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
