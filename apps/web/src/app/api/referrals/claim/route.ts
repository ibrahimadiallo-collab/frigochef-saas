import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabase/server';
import { jsonError, readJson, serverError, unauthorized } from '@/lib/api';
import { firstZodMessage, referralClaimSchema } from '@/lib/validation';
import { REFERRAL_REWARD_DAYS } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

const CLAIM_ERRORS: Record<string, { message: string; status: number }> = {
  not_authenticated: { message: 'Please sign in to continue.', status: 401 },
  no_profile: { message: 'Your profile is not ready yet. Please try again in a moment.', status: 409 },
  already_claimed: { message: 'You have already redeemed a referral code.', status: 409 },
  invalid_code: { message: 'This referral code does not exist.', status: 404 },
  own_code: { message: "You can't redeem your own referral code.", status: 400 },
};

/** POST { code }: riscatta un codice invito → 7 giorni di Pro per entrambi (funzione DB atomica). */
export async function POST(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();

    const parsed = referralClaimSchema.safeParse(await readJson(req));
    if (!parsed.success) return jsonError(firstZodMessage(parsed.error));

    const { data, error } = await auth.supabase.rpc('claim_referral', { code: parsed.data.code });
    if (error) throw error;

    const result = (data ?? {}) as { ok?: boolean; error?: string };
    if (!result.ok) {
      const mapped = CLAIM_ERRORS[result.error ?? ''] ?? { message: 'Could not redeem this code.', status: 400 };
      return jsonError(mapped.message, mapped.status);
    }

    const { data: profile } = await auth.supabase
      .from('profiles')
      .select('pro_expires_at')
      .eq('id', auth.user.id)
      .maybeSingle<{ pro_expires_at: string | null }>();

    return NextResponse.json({ ok: true, rewardDays: REFERRAL_REWARD_DAYS, proExpiresAt: profile?.pro_expires_at ?? null });
  } catch (error) {
    return serverError('referrals:claim', error, 'Could not redeem this code. Please try again.');
  }
}
