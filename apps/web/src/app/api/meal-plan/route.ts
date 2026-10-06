import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext } from '@/lib/supabase/server';
import { generateMealPlan } from '@/lib/ai';
import { firstZodMessage } from '@/lib/validation';
import { jsonError, readJson, serverError, unauthorized } from '@/lib/api';
import type { MealPlan } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const bodySchema = z.object({ preferences: z.string().trim().max(300).optional() });

/** Lunedì della settimana corrente (YYYY-MM-DD, UTC). */
function currentWeekStart(): string {
  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}

/** Ultimo piano settimanale salvato. */
export async function GET(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();
    const { data, error } = await auth.supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<MealPlan>();
    if (error) throw error;
    return NextResponse.json({ mealPlan: data ?? null });
  } catch (error) {
    return serverError('meal-plan-get', error, 'Could not load your meal plan.');
  }
}

/** Genera un piano di 7 giorni dalla dispensa e lo salva. */
export async function POST(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();

    const parsed = bodySchema.safeParse((await readJson(req)) ?? {});
    if (!parsed.success) return jsonError(firstZodMessage(parsed.error));

    const { data: pantryRows, error: pantryError } = await auth.supabase
      .from('pantry_items')
      .select('name')
      .eq('user_id', auth.user.id)
      .returns<{ name: string }[]>();
    if (pantryError) throw pantryError;

    const days = await generateMealPlan((pantryRows ?? []).map((p) => p.name), parsed.data.preferences);

    const { data, error } = await auth.supabase
      .from('meal_plans')
      .insert({ user_id: auth.user.id, week_start: currentWeekStart(), plan: { days } })
      .select('*')
      .single<MealPlan>();
    if (error) throw error;

    return NextResponse.json({ mealPlan: data }, { status: 201 });
  } catch (error) {
    return serverError('meal-plan-post', error, 'We could not create a meal plan right now. Please try again.');
  }
}
