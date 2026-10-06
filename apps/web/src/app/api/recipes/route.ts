import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabase/server';
import { RECIPE_COLUMNS, rowToRecipe } from '@/lib/recipes';
import { serverError, unauthorized } from '@/lib/api';
import type { RecipeRow } from '@/types';

export const dynamic = 'force-dynamic';

/** Lista delle ricette dell'utente (più recenti prima). `?limit=N` opzionale. */
export async function GET(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();

    const limitParam = Number(new URL(req.url).searchParams.get('limit'));
    const limit = Number.isInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 50;

    const { data, error } = await auth.supabase
      .from('recipes')
      .select(RECIPE_COLUMNS)
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(limit)
      .returns<RecipeRow[]>();
    if (error) throw error;

    return NextResponse.json({ recipes: (data ?? []).map(rowToRecipe) });
  } catch (error) {
    return serverError('recipes-list', error, 'Could not load your recipes.');
  }
}
