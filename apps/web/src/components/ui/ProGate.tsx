'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Lock, Sparkles } from 'lucide-react';
import { useUser } from '@/hooks/useCurrentUser';
import { useCheckout } from '@/hooks/useCheckout';
import { PRO_PRICE_LABEL } from '@/lib/pricing';
import { Button } from './Button';
import { Skeleton } from './Spinner';

interface ProGateProps {
  /** Nome della feature mostrato nell'overlay, es. "unlimited scans". */
  feature: string;
  children: ReactNode;
  /** Se false il contenuto è libero anche per gli utenti Free (es. quota non ancora esaurita). */
  locked?: boolean;
  /** Nota sulla quota Free, es. "You have 2 free scans left". */
  freeNote?: string;
}

/** Mostra i children agli utenti Pro (o finché la quota Free non è esaurita), altrimenti un overlay di upgrade. */
export function ProGate({ feature, children, locked = true, freeNote }: ProGateProps) {
  const { isPro, isLoading } = useUser();
  const { startCheckout, isCheckingOut } = useCheckout();

  if (isLoading) return <Skeleton className="h-48" />;
  if (isPro || !locked) return <>{children}</>;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10">
      <div className="pointer-events-none select-none opacity-30 blur-sm" aria-hidden>
        {children}
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/70 p-6 backdrop-blur-sm"
      >
        <div className="max-w-sm text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
            <Lock className="h-5 w-5" aria-hidden />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-emerald-400">Pro feature</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Unlock {feature} with FrigoChef Pro</h3>
          {freeNote && <p className="mt-2 text-sm text-white/60">{freeNote}</p>}
          <Button className="mt-5" onClick={() => startCheckout(`progate:${feature}`)} isLoading={isCheckingOut}>
            {!isCheckingOut && <Sparkles className="h-4 w-4" aria-hidden />} Upgrade to Pro · {PRO_PRICE_LABEL}/month
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
