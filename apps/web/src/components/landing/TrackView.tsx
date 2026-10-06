'use client';

import { useEffect } from 'react';
import { EVENTS, trackEvent } from '@/lib/analytics';

/** Registra la visualizzazione della landing (una volta per mount). */
export function TrackView() {
  useEffect(() => {
    trackEvent(EVENTS.LANDING_VIEW, { referrer: document.referrer || null });
  }, []);
  return null;
}
