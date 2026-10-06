import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabase/server';
import { serverError, unauthorized } from '@/lib/api';

export const dynamic = 'force-dynamic';

function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();
    const { supabase, user } = auth;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', user.id)
      .maybeSingle<{ referral_code: string | null }>();
    if (error) throw error;

    let referralCode = profile?.referral_code ?? null;
    if (!referralCode) {
      referralCode = generateCode();
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ referral_code: referralCode })
        .eq('id', user.id);
      if (updateError) throw updateError;
    }

    // Conteggio aggregato via RPC opzionale: con la RLS l'utente non può leggere i profili altrui.
    const { data: count } = await supabase.rpc('referral_count', { code: referralCode });
    const inviteCount = typeof count === 'number' ? count : 0;

    return NextResponse.json({
      referralCode,
      inviteCount,
      rewardLevel: inviteCount >= 5 ? 'Premium' : 'Standard',
    });
  } catch (error) {
    return serverError('referrals', error, 'Could not load your referral info.');
  }
}
