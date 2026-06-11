import { loadStripe } from '@stripe/stripe-js';
import Stripe from 'stripe';

export const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Castiamo a 'any' per bypassare il mismatch tra i tipi del pacchetto e l'API desiderata
// Questo permette al progetto di compilare mentre garantisce l'uso della versione stabile.
export const stripe = stripeSecretKey 
  ? new Stripe(stripeSecretKey, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiVersion: '2025-01-27.acacia' as any,
    })
  : null;
