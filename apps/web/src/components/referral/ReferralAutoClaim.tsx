'use client';

import { useEffect } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { REFERRAL_REWARD_DAYS } from '@/lib/pricing';
import { useToast } from '@/components/ui/ToastProvider';

/**
 * Riscatta automaticamente (una sola volta per utente/dispositivo) il codice `?ref=`
 * salvato nei metadata in fase di signup. Il server rifiuta comunque doppi riscatti.
 */
export function ReferralAutoClaim() {
  const toast = useToast();

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    void (async () => {
      const { data } = await createClient().auth.getUser();
      const user = data.user;
      const code = (user?.user_metadata as { referred_by?: unknown } | undefined)?.referred_by;
      if (!user || typeof code !== 'string' || !code.trim()) return;

      const flag = `fc_ref_attempted_${user.id}`;
      if (localStorage.getItem(flag)) return;
      localStorage.setItem(flag, '1');

      const res = await fetch('/api/referrals/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      }).catch(() => null);
      if (res?.ok) toast.success(`Invite redeemed! You unlocked ${REFERRAL_REWARD_DAYS} days of Pro.`);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
