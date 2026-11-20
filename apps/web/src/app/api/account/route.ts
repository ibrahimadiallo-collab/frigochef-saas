import { NextResponse } from 'next/server';
import { supabaseAdmin, getUserFromRequest } from '@/lib/supabase-admin';
import { stripe } from '@/lib/stripe';
import { executeAccountExport, executeAccountDeletion } from '@/lib/account';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const url = new URL(req.url);
    const isExport = url.searchParams.get('export') === 'true';

    if (!isExport) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select(
          'id, email, referral_code, referred_by, is_pro, subscription_status, subscription_plan, subscription_period_end, trial_used, dietary_preferences, allergens, created_at, updated_at'
        )
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116' && profileError.code !== '42P01') {
        console.error('Profile GET error:', profileError);
        return NextResponse.json(
          { error: 'Impossibile recuperare il profilo utente.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        profile: profile || {
          id: user.id,
          email: user.email,
          is_pro: false,
          subscription_status: 'free',
          subscription_plan: 'free',
          trial_used: false,
          dietary_preferences: [],
          allergens: [],
        },
      });
    }

    const result = await executeAccountExport(user.id, user.email, supabaseAdmin);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Account GET Error:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero dei dati account.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const body = await req.json();
    const dietaryPreferences = Array.isArray(body.dietaryPreferences)
      ? body.dietaryPreferences.filter((x: unknown): x is string => typeof x === 'string').slice(0, 12)
      : [];
    const allergens = Array.isArray(body.allergens)
      ? body.allergens.filter((x: unknown): x is string => typeof x === 'string').slice(0, 12)
      : [];

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        dietary_preferences: dietaryPreferences,
        allergens,
      })
      .eq('id', user.id);

    if (error) {
      console.error('Account PATCH DB Error:', error);
      return NextResponse.json(
        { error: 'Impossibile aggiornare le preferenze alimentari sul server.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, dietaryPreferences, allergens });
  } catch (error) {
    console.error('Account PATCH Error:', error);
    return NextResponse.json(
      { error: 'Impossibile aggiornare le preferenze alimentari sul server.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const result = await executeAccountDeletion(user.id, supabaseAdmin, stripe);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Account DELETE Error:', error);
    return NextResponse.json(
      { error: "Errore imprevisto durante l'eliminazione dell'account." },
      { status: 500 }
    );
  }
}
