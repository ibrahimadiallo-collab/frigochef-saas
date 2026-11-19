import { NextResponse } from 'next/server';
import { supabaseAdmin, getUserFromRequest } from '@/lib/supabase-admin';
import { stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

function isTableNotFoundError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return (
    err.code === '42P01' ||
    err.code === 'PGRST116' ||
    Boolean(err.message && err.message.includes('does not exist'))
  );
}

/**
 * GET /api/account
 * Restituisce profilo, stato abbonamento ed esportazione COMPLETA dati GDPR (ALTO 4: Art. 15 e 20 GDPR).
 */
export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const url = new URL(req.url);
    const isExport = url.searchParams.get('export') === 'true';

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select(
        'id, email, referral_code, is_pro, subscription_status, subscription_plan, subscription_period_end, trial_used, dietary_preferences, allergens, created_at, updated_at'
      )
      .eq('id', user.id)
      .single();

    if (profileError && !isTableNotFoundError(profileError)) {
      throw new Error(`Errore lettura profilo: ${profileError.message}`);
    }

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

    // ALTO 4 — Esportazione completa GDPR di TUTTE le tabelle associate all'utente
    const [
      pantryRes,
      recipesRes,
      savedRecipesRes,
      mealPlansRes,
      shoppingListsRes,
      aiUsageRes,
    ] = await Promise.all([
      supabaseAdmin.from('pantry').select('*').eq('user_id', user.id),
      supabaseAdmin.from('recipes').select('*').eq('user_id', user.id),
      supabaseAdmin.from('saved_recipes').select('*').eq('user_id', user.id),
      supabaseAdmin.from('meal_plans').select('*').eq('user_id', user.id),
      supabaseAdmin.from('shopping_lists').select('*').eq('user_id', user.id),
      supabaseAdmin.from('ai_usage_logs').select('*').eq('user_id', user.id),
    ]);

    const queryChecks = [
      { name: 'pantry', err: pantryRes.error },
      { name: 'recipes', err: recipesRes.error },
      { name: 'saved_recipes', err: savedRecipesRes.error },
      { name: 'meal_plans', err: mealPlansRes.error },
      { name: 'shopping_lists', err: shoppingListsRes.error },
      { name: 'ai_usage_logs', err: aiUsageRes.error },
    ];

    for (const check of queryChecks) {
      if (check.err && !isTableNotFoundError(check.err)) {
        throw new Error(`Errore esportazione tabella ${check.name}: ${check.err.message}`);
      }
    }

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      service: 'FrigoChef',
      gdprBasis: 'Art. 15 & Art. 20 Regolamento UE 2016/679 (Portabilità dei Dati)',
      user: {
        id: user.id,
        email: user.email,
      },
      profile: profile || null,
      pantry: pantryRes.data || [],
      generatedRecipes: recipesRes.data || [],
      savedRecipes: savedRecipesRes.data || [],
      mealPlans: mealPlansRes.data || [],
      shoppingLists: shoppingListsRes.data || [],
      aiUsageLogs: aiUsageRes.data || [],
    });
  } catch (error) {
    console.error('Account GET Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nel recupero dei dati account' },
      { status: 500 }
    );
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

    if (error) {
      throw new Error(error.message);
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

/**
 * DELETE /api/account
 * CRITICO 3 — Cancellazione coordinata, verificata e atomica dell'account:
 * 1. Annulla eventuali abbonamenti Stripe attivi prima di cancellare i dati (evita addebiti orfani).
 * 2. Cancella tutte le tabelle utente (shopping_lists, meal_plans, saved_recipes, recipes, pantry, ai_usage_logs, profiles) verificando ogni risposta.
 * 3. Cancella l'utente da Supabase Auth (auth.users) e verifica il risultato prima di restituire 200.
 */
export async function DELETE(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    // 1. Recupera eventuali riferimenti Stripe dal profilo prima della cancellazione
    const { data: profile, error: profileReadError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id, subscription_status')
      .eq('id', user.id)
      .single();

    if (profileReadError && !isTableNotFoundError(profileReadError)) {
      return NextResponse.json(
        { error: `Impossibile verificare lo stato dell'abbonamento prima della cancellazione: ${profileReadError.message}` },
        { status: 500 }
      );
    }

    // 2. Se esiste un abbonamento Stripe attivo, lo disdice immediatamente
    if (profile?.stripe_subscription_id || profile?.stripe_customer_id) {
      if (!stripe) {
        return NextResponse.json(
          {
            error:
              "Impossibile completare l'eliminazione dell'account: hai un profilo di fatturazione associato ma Stripe non è raggiungibile per chiudere l'abbonamento.",
          },
          { status: 503 }
        );
      }

      try {
        if (profile.stripe_subscription_id) {
          await stripe.subscriptions.cancel(profile.stripe_subscription_id);
        } else if (profile.stripe_customer_id) {
          const activeSubs = await stripe.subscriptions.list({
            customer: profile.stripe_customer_id,
            status: 'all',
          });
          for (const sub of activeSubs.data) {
            if (['active', 'trialing', 'past_due'].includes(sub.status)) {
              await stripe.subscriptions.cancel(sub.id);
            }
          }
        }
      } catch (stripeErr: unknown) {
        const stripeCode = (stripeErr as { code?: string })?.code;
        // Ignora solo se l'abbonamento risulta già cancellato su Stripe (resource_missing)
        if (stripeCode !== 'resource_missing') {
          console.error('Errore disdetta abbonamento Stripe durante DELETE /api/account:', stripeErr);
          return NextResponse.json(
            {
              error:
                "Impossibile annullare l'abbonamento Stripe attivo. Disdici prima l'abbonamento dal portale pagamenti o riprova.",
            },
            { status: 502 }
          );
        }
      }
    }

    // 3. Cancellazione sequenziale e verificata su tutte le tabelle utente
    const userTables: Array<{ table: string; column: string }> = [
      { table: 'shopping_lists', column: 'user_id' },
      { table: 'meal_plans', column: 'user_id' },
      { table: 'saved_recipes', column: 'user_id' },
      { table: 'recipes', column: 'user_id' },
      { table: 'pantry', column: 'user_id' },
      { table: 'ai_usage_logs', column: 'user_id' },
      { table: 'profiles', column: 'id' },
    ];

    const deletedTables: string[] = [];

    for (const { table, column } of userTables) {
      const { error: delError } = await supabaseAdmin
        .from(table)
        .delete()
        .eq(column, user.id);

      if (delError && !isTableNotFoundError(delError)) {
        console.error(`Errore eliminazione dati dalla tabella ${table}:`, delError);
        return NextResponse.json(
          {
            error: `Cancellazione interrotta sulla tabella ${table}: ${delError.message}`,
            partialProgress: deletedTables,
          },
          { status: 500 }
        );
      }
      deletedTables.push(table);
    }

    // 4. Eliminazione utente da Supabase Auth
    if (!supabaseAdmin.auth?.admin?.deleteUser) {
      return NextResponse.json(
        { error: 'Servizio di amministrazione Auth non disponibile per completare la cancellazione.' },
        { status: 503 }
      );
    }

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (authDeleteError) {
      console.error('Errore deleteUser su Supabase Auth:', authDeleteError);
      return NextResponse.json(
        {
          error: `Dati applicativi rimossi ma impossibile eliminare la credenziale Auth: ${authDeleteError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedTables,
      message: 'Account, abbonamento e dati personali eliminati definitivamente.',
    });
  } catch (error) {
    console.error('Account DELETE Error:', error);
    return NextResponse.json(
      { error: "Errore imprevisto durante l'eliminazione dell'account." },
      { status: 500 }
    );
  }
}
