import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabase/server';
import { RATE_LIMITS, rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { generateRecipe } from '@/lib/ai';
import { effectiveExpiration } from '@/lib/freshness';
import { foodImageFor, RECIPE_COLUMNS, rowToRecipe } from '@/lib/recipes';
import { firstZodMessage, recipeGenerateSchema } from '@/lib/validation';
import { jsonError, readJson, serverError, unauthorized } from '@/lib/api';
import type { IngredientCategory, RecipeRow } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface PantryRow {
  name: string;
  category: IngredientCategory;
  estimated_expiration: string | null;
  added_at: string;
}

/** `{ preferences?, mealType?, servings? }` → genera una ricetta dalla dispensa e la salva. */
export async function POST(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();
    const { supabase, user } = auth;

    const rl = await rateLimit(`recipeGenerate:${user.id}`, RATE_LIMITS.recipeGenerate.limit, RATE_LIMITS.recipeGenerate.windowMs);
    if (!rl.success) return tooManyRequests(rl);

    const parsed = recipeGenerateSchema.safeParse((await readJson(req)) ?? {});
    if (!parsed.success) return jsonError(firstZodMessage(parsed.error));
    const { preferences, mealType, servings } = parsed.data;

    const { data: pantryRows, error: pantryError } = await supabase
      .from('pantry_items')
      .select('name, category, estimated_expiration, added_at')
      .eq('user_id', user.id)
      .returns<PantryRow[]>();
    if (pantryError) throw pantryError;

    // Gli ingredienti in scadenza vanno per primi, così l'AI li privilegia (anti-spreco).
    const pantry = (pantryRows ?? [])
      .sort((a, b) => new Date(effectiveExpiration(a)).getTime() - new Date(effectiveExpiration(b)).getTime())
      .map((p) => p.name)
      .slice(0, 60);

    const { recipe } = await generateRecipe({ pantry, preferences, mealType, servings });

    const { data: row, error } = await supabase
      .from('recipes')
      .insert({
        user_id: user.id,
        title: recipe.title,
        description: recipe.description,
        prep_time: recipe.prepTime,
        cook_time: recipe.cookTime,
        difficulty: recipe.difficulty,
        servings: recipe.servings,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        nutrition: recipe.nutrition,
        used_pantry_ingredients: recipe.usedPantryIngredients,
        missing_ingredients: recipe.missingIngredients,
        tags: recipe.tags,
        meal_type: mealType ?? null,
        image_url: foodImageFor(recipe.title),
        is_public: false,
      })
      .select(RECIPE_COLUMNS)
      .single<RecipeRow>();
    if (error) throw error;

    return NextResponse.json({ recipe: rowToRecipe(row) }, { status: 201 });
  } catch (error) {
    return serverError('recipes-generate', error, 'We could not generate a recipe right now. Please try again.');
  }
}
