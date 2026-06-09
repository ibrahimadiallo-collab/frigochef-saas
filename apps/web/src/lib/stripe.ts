import { loadStripe } from '@stripe/stripe-js';
import Stripe from 'stripe';

export const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey 
  ? new Stripe(stripeSecretKey, {
      // @ts-expect-error - Future API version might not be in current types
      apiVersion: '2026-04-22.dahlia',
    })
  : null;
