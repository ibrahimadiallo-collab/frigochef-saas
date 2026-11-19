import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin, getUserFromRequest } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe non configurato' }, { status: 503 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Nessun profilo di fatturazione Stripe associato a questo account.' },
        { status: 404 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://frigochef-saas-web.vercel.app';
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/profile`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Stripe Portal Error:', error);
    return NextResponse.json(
      { error: 'Impossibile aprire il portale di gestione abbonamento.' },
      { status: 500 }
    );
  }
}
