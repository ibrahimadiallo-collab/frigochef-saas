'use client';

import { useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/http';
import { EVENTS, trackEvent } from '@/lib/analytics';
import { useToast } from '@/components/ui/ToastProvider';

/** Avvia il checkout Stripe (il price id reale è risolto lato server). */
export function useCheckout() {
  const toast = useToast();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  async function startCheckout(source: string) {
    setIsCheckingOut(true);
    try {
      const { url } = await apiFetch<{ url: string | null }>('/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID }),
      });
      if (!url) throw new Error('Checkout is unavailable right now.');
      trackEvent(EVENTS.SUBSCRIPTION_STARTED, { source, stage: 'checkout_opened' });
      window.location.href = url;
    } catch (err) {
      toast.error(errorMessage(err));
      setIsCheckingOut(false);
    }
  }

  return { startCheckout, isCheckingOut };
}
