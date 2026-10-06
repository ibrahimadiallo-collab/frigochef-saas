import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabase/server';
import { generateMealPlan } from '@/lib/ai';
import { computeFreshness } from '@/lib/freshness';
import { mealPlanRequestSchema, mealPlanSchema, firstZodMessage } from '@/lib/validation';
import { jsonError, readJson, serverError, unauthorized } from '@/lib/api';
import { getUsage } from '@/lib/usage';
import { FREE_LIMITS } from '@/lib/pricing';
import { mondayOf, normalizeWeekStart } from '@/lib/week';
import type { IngredientCategory, MealPlan } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const weekParam = /^\d{4}-\d{2}-\d{2}$/;

/** Restituisce il piano solo se il JSONB ha il formato attuale (i piani legacy vengono ignorati). */
function normalizePlan(row: MealPlan | null): MealPlan | null {
  if (!row) return null;
  const parsed = mealPlanSchema.safeParse(row.plan);
  return parsed.success ? { ...row, plan: { ...parsed.data, weekStart: row.week_start } } : null;
}

/** GET ?weekStart=YYYY-MM-DD (default: settimana corrente) → `{ plan }`. */
export async function GET(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();
    const requested = new URL(req.url).searchParams.get('weekStart');
    if (requested && !weekParam.test(requested)) return jsonError('Use the YYYY-MM-DD date format for weekStart.');
    const weekStart = requested ? normalizeWeekStart(requested) : mondayOf();

    const { data, error } = await auth.supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', auth.user.id)
      .eq('week_start', weekStart)
      .maybeSingle<MealPlan>();
    if (error) throw error;
    return NextResponse.json({ plan: normalizePlan(data ?? null) });
  } catch (error) {
    return serverError('meal-plan-get', error, 'Could not load your meal plan.');
  }
}

/** POST `{ weekStart?, preferences?, servings? }` → genera con AI e salva (upsert per settimana). */
export async function POST(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();

    const parsed = mealPlanRequestSchema.safeParse((await readJson(req)) ?? {});
    if (!parsed.success) return jsonError(firstZodMessage(parsed.error));
    const weekStart = normalizeWeekStart(parsed.data.weekStart ?? mondayOf());

    const usage = await getUsage(auth.supabase, auth.user.id);
    if (!usage.isPro && usage.mealPlanCount >= FREE_LIMITS.mealPlans) {
      return jsonError('Your free meal plan has been used. Upgrade to Pro for unlimited weekly plans.', 402);
    }

    const { data: pantryRows, error: pantryError } = await auth.supabase
      .from('pantry_items')
      .select('name, quantity, unit, category, estimated_expiration, added_at')
      .eq('user_id', auth.user.id)
      .returns<{ name: string; quantity: number | null; unit: string | null; category: IngredientCategory; estimated_expiration: string | null; added_at: string | null }[]>();
    if (pantryError) throw pantryError;

    const pantry = (pantryRows ?? []).map((p) => ({
      name: p.name,
      quantity: p.quantity,
      unit: p.unit,
      freshness: computeFreshness(p),
    }));

    const content = await generateMealPlan({
      weekStart,
      pantry,
      preferences: parsed.data.preferences,
      servings: parsed.data.servings,
    });

    const { data, error } = await auth.supabase
      .from('meal_plans')
      .upsert({ user_id: auth.user.id, week_start: weekStart, plan: content, created_at: new Date().toISOString() }, { onConflict: 'user_id,week_start' })
      .select('*')
      .single<MealPlan>();
    if (error) throw error;

    return NextResponse.json({ plan: data }, { status: 201 });
  } catch (error) {
    return serverError('meal-plan-post', error, 'We could not create a meal plan right now. Please try again.');
  }
}
