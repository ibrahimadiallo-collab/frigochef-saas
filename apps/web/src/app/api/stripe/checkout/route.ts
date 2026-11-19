import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin, getUserFromRequest } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Devi accedere al tuo account prima di attivare FrigoChef Plus.' },
        { status: 401 }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Il sistema di pagamento Stripe non è ancora configurato sul server.' },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const billingCycle: 'monthly' | 'annual' =
      body.plan === 'annual' ? 'annual' : 'monthly';

    // 1. Verifica profilo esistente per prevenire doppi abbonamenti o riuso improprio della prova gratuita
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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://frigochef-saas-web.vercel.app';

    // 2. Determina il prezzo configurato sul server (non accetta prezzi arbitrari dal client)
    const configuredPriceId =
      billingCycle === 'annual'
        ? process.env.STRIPE_PRICE_ANNUAL_ID
        : process.env.STRIPE_PRICE_MONTHLY_ID || process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;

    const lineItem =
      configuredPriceId && configuredPriceId !== 'price_placeholder'
        ? { price: configuredPriceId, quantity: 1 }
        : {
            price_data: {
              currency: 'eur',
              product_data: {
                name:
                  billingCycle === 'annual'
                    ? 'FrigoChef Plus — Piano Annuale'
                    : 'FrigoChef Plus — Piano Mensile',
                description:
                  '50 scansioni frigo AI/mese, 50 ricette AI/giorno, 4 piani settimanali/mese e filtri nutrizionali avanzati.',
              },
              unit_amount: billingCycle === 'annual' ? 4999 : 599,
              recurring: {
                interval: (billingCycle === 'annual' ? 'year' : 'month') as 'year' | 'month',
              },
            },
            quantity: 1,
          };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [lineItem],
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
      success_url: `${appUrl}/profile?checkout=success`,
      cancel_url: `${appUrl}/profile?checkout=canceled`,
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
