import 'server-only';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

/** Client Stripe server-side (null se STRIPE_SECRET_KEY non è configurata). */
export const stripe: Stripe | null = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
