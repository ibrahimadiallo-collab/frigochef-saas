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

/**
 * Passo 10 P1 — Rimossi tutti i dati finti (CHEF2026 / inviteCount: 2).
 * Se l'utente non è autenticato restituisce 401; in caso di errore DB restituisce 500.
 */
export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('referral_code')
      .eq('id', user.id)
      .single();

    if (profileErr && profileErr.code !== 'PGRST116') {
      console.error('Referral profile read error:', profileErr);
      return NextResponse.json(
        { error: 'Impossibile recuperare il codice invito.' },
        { status: 500 }
      );
    }

    let referralCode = profile?.referral_code;

    if (!referralCode) {
      const newCode = generateCode();
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ referral_code: newCode })
        .eq('id', user.id)
        .select('referral_code')
        .single();

      if (updateError || !updatedProfile?.referral_code) {
        console.error('Referral code creation error:', updateError);
        return NextResponse.json(
          { error: 'Impossibile generare il codice invito.' },
          { status: 500 }
        );
      }
      referralCode = updatedProfile.referral_code;
    }

    const { count, error: countErr } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', referralCode);

    if (countErr) {
      console.error('Referral count error:', countErr);
      return NextResponse.json(
        { error: 'Impossibile calcolare il conteggio inviti.' },
        { status: 500 }
      );
    }

    const inviteCount = count || 0;
    return NextResponse.json({
      referralCode,
      inviteCount,
      rewardLevel: inviteCount >= 5 ? 'Premium' : 'Standard',
    });
  } catch (error) {
    console.error('Referrals API Error:', error);
    return NextResponse.json(
      { error: 'Servizio inviti temporaneamente non disponibile.' },
      { status: 500 }
    );
  }
}
