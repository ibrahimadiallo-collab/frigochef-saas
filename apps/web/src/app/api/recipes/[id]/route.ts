import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext } from '@/lib/supabase/server';
import { RECIPE_COLUMNS, rowToRecipe } from '@/lib/recipes';
import { firstZodMessage, recipeUpdateSchema } from '@/lib/validation';
import { jsonError, readJson, serverError, unauthorized } from '@/lib/api';
import type { RecipeRow } from '@/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };
const idSchema = z.string().uuid();

export async function GET(req: Request, { params }: Params) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();
    const { id } = await params;
    if (!idSchema.safeParse(id).success) return jsonError('Recipe not found.', 404);

    const { data, error } = await auth.supabase
      .from('recipes')
      .select(RECIPE_COLUMNS)
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .maybeSingle<RecipeRow>();
    if (error) throw error;
    if (!data) return jsonError('Recipe not found.', 404);

    return NextResponse.json({ recipe: rowToRecipe(data) });
  } catch (error) {
    return serverError('recipe-get', error, 'Could not load this recipe.');
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();
    const { id } = await params;
    if (!idSchema.safeParse(id).success) return jsonError('Recipe not found.', 404);

    const parsed = recipeUpdateSchema.safeParse(await readJson(req));
    if (!parsed.success) return jsonError(firstZodMessage(parsed.error));
    if (Object.keys(parsed.data).length === 0) return jsonError('Nothing to update.');

    const { data, error } = await auth.supabase
      .from('recipes')
      .update(parsed.data)
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .select(RECIPE_COLUMNS)
      .maybeSingle<RecipeRow>();
    if (error) throw error;
    if (!data) return jsonError('Recipe not found.', 404);

    return NextResponse.json({ recipe: rowToRecipe(data) });
  } catch (error) {
    return serverError('recipe-patch', error, 'Could not update this recipe.');
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();
    const { id } = await params;
    if (!idSchema.safeParse(id).success) return jsonError('Recipe not found.', 404);

    const { data, error } = await auth.supabase
      .from('recipes')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .select('id');
    if (error) throw error;
    if (!data?.length) return jsonError('Recipe not found.', 404);

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError('recipe-delete', error, 'Could not delete this recipe.');
  }
}
