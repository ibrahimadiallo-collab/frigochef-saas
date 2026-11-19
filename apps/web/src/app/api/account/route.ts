import { NextResponse } from 'next/server';
import { supabaseAdmin, getUserFromRequest } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/account
 * Restituisce profilo, stato abbonamento ed esportazione completa dati GDPR (Art. 15 e 20 GDPR).
 */
export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const url = new URL(req.url);
    const isExport = url.searchParams.get('export') === 'true';

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select(
        'id, email, referral_code, is_pro, subscription_status, subscription_plan, subscription_period_end, trial_used, dietary_preferences, allergens, created_at'
      )
      .eq('id', user.id)
      .single();

    if (!isExport) {
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

    // Esportazione completa GDPR di tutti i dati associati all'utente
    const [{ data: pantry }, { data: recipes }, { data: savedRecipes }] = await Promise.all([
      supabaseAdmin.from('pantry').select('*').eq('user_id', user.id),
      supabaseAdmin.from('recipes').select('*').eq('user_id', user.id),
      supabaseAdmin.from('saved_recipes').select('*').eq('user_id', user.id),
    ]);

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      service: 'FrigoChef',
      user: {
        id: user.id,
        email: user.email,
      },
      profile: profile || null,
      pantry: pantry || [],
      generatedRecipes: recipes || [],
      savedRecipes: savedRecipes || [],
    });
  } catch (error) {
    console.error('Account GET Error:', error);
    return NextResponse.json({ error: 'Errore nel recupero dei dati account' }, { status: 500 });
  }
}

/**
 * PATCH /api/account
 * Aggiorna esclusivamente le preferenze alimentari e gli allergeni (mai i campi di fatturazione).
 */
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

    if (error) throw error;

    return NextResponse.json({ success: true, dietaryPreferences, allergens });
  } catch (error) {
    console.error('Account PATCH Error:', error);
    return NextResponse.json(
      { error: 'Impossibile aggiornare le preferenze alimentari' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/account
 * Cancellazione definitiva dell'account e di tutti i dati personali (Art. 17 GDPR - Diritto all'oblio).
 */
export async function DELETE(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    await Promise.allSettled([
      supabaseAdmin.from('pantry').delete().eq('user_id', user.id),
      supabaseAdmin.from('saved_recipes').delete().eq('user_id', user.id),
      supabaseAdmin.from('recipes').delete().eq('user_id', user.id),
      supabaseAdmin.from('ai_usage_logs').delete().eq('user_id', user.id),
      supabaseAdmin.from('profiles').delete().eq('id', user.id),
    ]);

    if (supabaseAdmin.auth?.admin?.deleteUser) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Account e dati personali eliminati definitivamente.',
    });
  } catch (error) {
    console.error('Account DELETE Error:', error);
    return NextResponse.json(
      { error: "Errore durante l'eliminazione dell'account." },
      { status: 500 }
    );
  }
}
