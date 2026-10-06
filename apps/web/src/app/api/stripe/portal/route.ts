import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getAuthContext } from '@/lib/supabase/server';
import { jsonError, serverError, unauthorized } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** POST → `{ url }` di una sessione Stripe Customer Portal per gestire l'abbonamento. */
export async function POST(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();
    if (!stripe) return jsonError('Payments are not available right now.', 503);

    const { data: profile, error } = await auth.supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', auth.user.id)
      .maybeSingle<{ stripe_customer_id: string | null }>();
    if (error) throw error;
    if (!profile?.stripe_customer_id) return jsonError('No active subscription found.', 400);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/profile`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return serverError('stripe-portal', error, 'Could not open the billing portal. Please try again.');
  }
}
