import { NextResponse } from 'next/server';
import { supabaseAdmin, getUserFromRequest } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function generateCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Get user's referral code
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('referral_code')
      .eq('id', user.id)
      .single();

    let currentProfile = profile;

    // 2. If no code, create one
    if (!currentProfile?.referral_code) {
      const newCode = generateCode();
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .upsert({ id: user.id, referral_code: newCode })
        .select()
        .single();

      if (updateError) throw updateError;
      currentProfile = updatedProfile;
    }

    // 3. Get referral stats
    const { count } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', currentProfile?.referral_code);

    return NextResponse.json({
      referralCode: currentProfile?.referral_code,
      inviteCount: count || 0,
      rewardLevel: (count || 0) >= 5 ? 'Premium' : 'Standard'
    });

  } catch (error) {
    console.error('Referral API Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
