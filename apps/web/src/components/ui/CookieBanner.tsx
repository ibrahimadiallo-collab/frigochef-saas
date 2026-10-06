'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cookie } from 'lucide-react';
import { COOKIE_CONSENT_KEY, getCookieConsent, type CookieConsent } from '@/lib/analytics';
import { Button } from './Button';

/** Banner GDPR: compare finché l'utente non sceglie; se rifiuta, trackEvent() non invia nulla. */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getCookieConsent() === null);
  }, []);

  function choose(value: CookieConsent) {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, value);
    } catch {
      // Storage non disponibile (es. navigazione privata): chiudiamo comunque il banner.
    }
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-live="polite"
          aria-label="Cookie consent"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed inset-x-3 bottom-24 z-[60] mx-auto max-w-2xl rounded-2xl border border-white/10 bg-gray-950/95 p-4 shadow-2xl backdrop-blur-xl sm:bottom-6 lg:bottom-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="flex flex-1 items-start gap-2 text-sm text-white/75">
              <Cookie className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              We use cookies to improve your experience. Essential cookies keep you signed in; analytics help us make FrigoChef better.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => choose('declined')}>Decline</Button>
              <Button size="sm" onClick={() => choose('accepted')}>Accept</Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
