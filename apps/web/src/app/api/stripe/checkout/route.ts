import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin, getUserFromRequest } from '@/lib/supabase-admin';
import {
  arePaymentsEnabled,
  getConfiguredStripePriceId,
  resolveSafeAppOrigin,
  BillingCycle,
} from '@/lib/billing';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Kill-switch pagamenti (P0): disabilitato di default finché PAYMENTS_ENABLED !== 'true'
    if (!arePaymentsEnabled()) {
      return NextResponse.json(
        {
          error:
            'Gli abbonamenti sono temporaneamente disabilitati in attesa dell’apertura ufficiale (PAYMENTS_ENABLED=false).',
          paymentsDisabled: true,
        },
        { status: 503 }
      );
    }

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Devi accedere al tuo account prima di attivare FrigoChef Plus.' },
        { status: 401 }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Il sistema di pagamento Stripe non è configurato sul server.' },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const billingCycle: BillingCycle = body.plan === 'annual' ? 'annual' : 'monthly';

    // 2. Richiede obbligatoriamente un priceId configurato nel catalogo Stripe (nessun prezzo inline nel codice)
    const configuredPriceId = getConfiguredStripePriceId(billingCycle);
    if (!configuredPriceId) {
      return NextResponse.json(
        {
          error: `Il piano selezionato (${billingCycle}) non ha un ID prezzo Stripe configurato sul server.`,
        },
        { status: 503 }
      );
    }

    // 3. Verifica profilo esistente per prevenire doppi abbonamenti o riuso improprio della prova gratuita
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_pro, stripe_customer_id, subscription_status, trial_used')
      .eq('id', user.id)
      .single();

    if (profile?.is_pro && ['active', 'trialing'].includes(profile.subscription_status || '')) {
      return NextResponse.json(
        {
          error: 'Hai già un abbonamento FrigoChef Plus attivo. Gestiscilo dalla pagina Profilo.',
          alreadySubscribed: true,
        },
        { status: 409 }
      );
    }

    const eligibleForTrial = !profile?.trial_used;
    const appOrigin = resolveSafeAppOrigin(req);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: configuredPriceId, quantity: 1 }],
      ...(profile?.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : { customer_email: user.email }),
      subscription_data: {
        ...(eligibleForTrial ? { trial_period_days: 7 } : {}),
        metadata: {
          userId: user.id,
          plan: billingCycle === 'annual' ? 'plus_annual' : 'plus_monthly',
        },
      },
      metadata: {
        userId: user.id,
        plan: billingCycle === 'annual' ? 'plus_annual' : 'plus_monthly',
      },
      success_url: `${appOrigin}/profile?checkout=success`,
      cancel_url: `${appOrigin}/profile?checkout=canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json(
      { error: 'Errore durante la creazione della sessione di pagamento.' },
      { status: 500 }
    );
  }
}
