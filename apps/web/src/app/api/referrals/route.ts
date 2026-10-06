import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabase/server';
import { serverError, unauthorized } from '@/lib/api';
import { REFERRAL_REWARD_DAYS } from '@/lib/pricing';
import type { ReferralInfo } from '@/types';

export const dynamic = 'force-dynamic';

function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

interface ReferralProfile {
  referral_code: string | null;
  pro_expires_at: string | null;
  referral_claimed_at: string | null;
}

export type ReferralResponse = ReferralInfo & {
  /** Alias retrocompatibile di totalInvited. */
  inviteCount: number;
  hasClaimed: boolean;
};

export async function GET(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();
    const { supabase, user } = auth;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('referral_code, pro_expires_at, referral_claimed_at')
      .eq('id', user.id)
      .maybeSingle<ReferralProfile>();
    if (error) throw error;

    let referralCode = profile?.referral_code ?? null;
    // Generazione lazy con un retry in caso di collisione sul vincolo UNIQUE.
    for (let attempt = 0; !referralCode && attempt < 3; attempt++) {
      const candidate = generateCode();
      const { error: updateError } = await supabase.from('profiles').update({ referral_code: candidate }).eq('id', user.id);
      if (!updateError) referralCode = candidate;
      else if (updateError.code !== '23505') throw updateError;
    }
    if (!referralCode) throw new Error('Could not allocate a referral code');

    // Con la RLS l'utente non può leggere i profili altrui: conteggio via RPC SECURITY DEFINER.
    const { data: count } = await supabase.rpc('referral_count', { code: referralCode });
    const totalInvited = typeof count === 'number' ? count : 0;

    const body: ReferralResponse = {
      referralCode,
      totalInvited,
      inviteCount: totalInvited,
      rewards: Array.from({ length: totalInvited }, (_, i) => ({ label: `Invite #${i + 1}`, days: REFERRAL_REWARD_DAYS })),
      proExpiresAt: profile?.pro_expires_at ?? null,
      hasClaimed: Boolean(profile?.referral_claimed_at),
    };
    return NextResponse.json(body);
  } catch (error) {
    return serverError('referrals', error, 'Could not load your referral info.');
  }
}
