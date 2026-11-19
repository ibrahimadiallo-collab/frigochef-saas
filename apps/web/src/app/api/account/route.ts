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

export async function executeAccountExport(
  userId: string,
  userEmail: string | undefined,
  db: typeof supabaseAdmin = supabaseAdmin
): Promise<{ status: number; body: Record<string, unknown> }> {
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select(
      'id, email, referral_code, is_pro, subscription_status, subscription_plan, subscription_period_end, trial_used, dietary_preferences, allergens, created_at, updated_at'
    )
    .eq('id', userId)
    .single();

  if (profileError && !isTableNotFoundError(profileError)) {
    return { status: 500, body: { error: `Errore lettura profilo: ${profileError.message}` } };
  }

  const [
    pantryRes,
    recipesRes,
    savedRecipesRes,
    mealPlansRes,
    shoppingListsRes,
    aiUsageRes,
  ] = await Promise.all([
    db.from('pantry').select('*').eq('user_id', userId),
    db.from('recipes').select('*').eq('user_id', userId),
    db.from('saved_recipes').select('*').eq('user_id', userId),
    db.from('meal_plans').select('*').eq('user_id', userId),
    db.from('shopping_lists').select('*').eq('user_id', userId),
    db.from('ai_usage_logs').select('*').eq('user_id', userId),
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
      return {
        status: 500,
        body: { error: `Errore esportazione tabella ${check.name}: ${check.err.message}` },
      };
    }
  }

  return {
    status: 200,
    body: {
      exportedAt: new Date().toISOString(),
      service: 'FrigoChef',
      gdprBasis: 'Art. 15 & Art. 20 Regolamento UE 2016/679 (Portabilità dei Dati)',
      user: {
        id: userId,
        email: userEmail,
      },
      profile: profile || null,
      pantry: pantryRes.data || [],
      generatedRecipes: recipesRes.data || [],
      savedRecipes: savedRecipesRes.data || [],
      mealPlans: mealPlansRes.data || [],
      shoppingLists: shoppingListsRes.data || [],
      aiUsageLogs: aiUsageRes.data || [],
    },
  };
}

export async function executeAccountDeletion(
  userId: string,
  db: typeof supabaseAdmin = supabaseAdmin,
  stripeClient: typeof stripe = stripe
): Promise<{ status: number; body: Record<string, unknown> }> {
  const { data: profile, error: profileReadError } = await db
    .from('profiles')
    .select('stripe_customer_id, stripe_subscription_id, subscription_status')
    .eq('id', userId)
    .single();

  if (profileReadError && !isTableNotFoundError(profileReadError)) {
    return {
      status: 500,
      body: {
        error: `Impossibile verificare lo stato dell'abbonamento prima della cancellazione: ${profileReadError.message}`,
      },
    };
  }

  if (profile?.stripe_subscription_id || profile?.stripe_customer_id) {
    if (!stripeClient) {
      return {
        status: 503,
        body: {
          error:
            "Impossibile completare l'eliminazione dell'account: hai un profilo di fatturazione associato ma Stripe non è raggiungibile per chiudere l'abbonamento.",
        },
      };
    }

    try {
      if (profile.stripe_subscription_id) {
        await stripeClient.subscriptions.cancel(profile.stripe_subscription_id);
      } else if (profile.stripe_customer_id) {
        const activeSubs = await stripeClient.subscriptions.list({
          customer: profile.stripe_customer_id,
          status: 'all',
        });
        for (const sub of activeSubs.data) {
          if (['active', 'trialing', 'past_due'].includes(sub.status)) {
            await stripeClient.subscriptions.cancel(sub.id);
          }
        }
      }
    } catch (stripeErr: unknown) {
      const stripeCode = (stripeErr as { code?: string })?.code;
      if (stripeCode !== 'resource_missing') {
        console.error('Errore disdetta abbonamento Stripe durante DELETE /api/account:', stripeErr);
        return {
          status: 502,
          body: {
            error:
              "Impossibile annullare l'abbonamento Stripe attivo. Disdici prima l'abbonamento dal portale pagamenti o riprova.",
          },
        };
      }
    }
  }

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
    const { error: delError } = await db.from(table).delete().eq(column, userId);

    if (delError && !isTableNotFoundError(delError)) {
      console.error(`Errore eliminazione dati dalla tabella ${table}:`, delError);
      return {
        status: 500,
        body: {
          error: `Cancellazione interrotta sulla tabella ${table}: ${delError.message}`,
          partialProgress: deletedTables,
        },
      };
    }
    deletedTables.push(table);
  }

  if (!db.auth?.admin?.deleteUser) {
    return {
      status: 503,
      body: { error: 'Servizio di amministrazione Auth non disponibile per completare la cancellazione.' },
    };
  }

  const { error: authDeleteError } = await db.auth.admin.deleteUser(userId);
  if (authDeleteError) {
    console.error('Errore deleteUser su Supabase Auth:', authDeleteError);
    return {
      status: 500,
      body: {
        error: `Dati applicativi rimossi ma impossibile eliminare la credenziale Auth: ${authDeleteError.message}`,
      },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      deletedTables,
      message: 'Account, abbonamento e dati personali eliminati definitivamente.',
    },
  };
}

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
          'id, email, referral_code, is_pro, subscription_status, subscription_plan, subscription_period_end, trial_used, dietary_preferences, allergens, created_at, updated_at'
        )
        .eq('id', user.id)
        .single();

      if (profileError && !isTableNotFoundError(profileError)) {
        throw new Error(`Errore lettura profilo: ${profileError.message}`);
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
      { error: error instanceof Error ? error.message : 'Errore nel recupero dei dati account' },
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
