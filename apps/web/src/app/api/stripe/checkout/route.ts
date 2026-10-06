import { NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe } from '@/lib/stripe';
import { getAuthContext } from '@/lib/supabase/server';
import { jsonError, readJson, serverError, unauthorized } from '@/lib/api';

export const dynamic = 'force-dynamic';

const checkoutSchema = z.object({ priceId: z.string().trim().min(1).optional() });

export async function POST(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();
    if (!stripe) return jsonError('Payments are not available right now.', 503);

    const parsed = checkoutSchema.safeParse((await readJson(req)) ?? {});
    // Il priceId lato server ha la precedenza: il client non può scegliere prezzi arbitrari.
    const priceId = process.env.STRIPE_PRICE_ID || (parsed.success ? parsed.data.priceId : undefined);
    if (!priceId) return jsonError('No subscription plan is configured.', 503);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${appUrl}/dashboard?upgraded=true`,
      cancel_url: `${appUrl}/profile?canceled=true`,
      customer_email: auth.user.email,
      metadata: { userId: auth.user.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return serverError('stripe-checkout', error, 'Could not start checkout. Please try again.');
  }
}
