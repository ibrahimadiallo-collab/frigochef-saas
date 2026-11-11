import { NextResponse } from 'next/server';
import { generateRecipe } from '@/lib/ai';
import { supabaseAdmin, getUserFromRequest } from '@/lib/supabase-admin';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const rate = checkRateLimit(req, 'recipe', 10, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Troppi tentativi. Riprova tra ${rate.retryAfterSeconds} secondi.` },
        { status: 429 }
      );
    }

    const { ingredients, mealType, time } = await req.json();

    if (!ingredients) {
      return NextResponse.json({ error: 'Ingredienti mancanti' }, { status: 400 });
    }

    const recipe = await generateRecipe(ingredients, mealType, time);
    const user = await getUserFromRequest(req);

    const slug =
      recipe.nome
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '') +
      '-' +
      Math.random().toString(36).substring(2, 7);

    const { data: savedRecipe, error: saveError } = await supabaseAdmin
      .from('recipes')
      .insert([
        {
          user_id: user?.id,
          recipe_data: recipe,
          slug,
          is_public: true,
        },
      ])
      .select()
      .single();

    if (saveError) {
      console.error('Error saving recipe:', saveError);
    }

    return NextResponse.json({
      ...recipe,
      id: savedRecipe?.id,
    });
  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Errore interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
