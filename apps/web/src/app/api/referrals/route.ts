import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Get user's referral code
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', user.id)
      .single();

    // 2. If no code, create one
    if (!profile?.referral_code) {
      const newCode = generateCode();
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, referral_code: newCode })
        .select()
        .single();
      
      if (updateError) throw updateError;
      profile = updatedProfile;
    }

    // 3. Get referral stats
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', profile.referral_code);

    return NextResponse.json({
      referralCode: profile.referral_code,
      inviteCount: count || 0,
      rewardLevel: (count || 0) >= 5 ? 'Premium' : 'Standard'
    });

  } catch (error: any) {
    console.error('Referral API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
