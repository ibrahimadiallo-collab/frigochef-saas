import { NextResponse } from 'next/server';
import { generateRecipe } from '@/lib/ai';
import { supabaseAdmin, getUserFromRequest } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const { ingredients, mealType, time } = await req.json();

    if (!ingredients) {
      return NextResponse.json({ error: 'Ingredienti mancanti' }, { status: 400 });
    }

    const recipe = await generateRecipe(ingredients, mealType, time);
    const user = await getUserFromRequest(req);

    // Salva la ricetta nel database pubblico per SEO e condivisione
    const { data: savedRecipe, error: saveError } = await supabaseAdmin
      .from('recipes')
      .insert([
        {
          user_id: user?.id,
          recipe_data: recipe,
          is_public: true
        }
      ])
      .select()
      .single();

    if (saveError) {
      console.error('Error saving recipe:', saveError);
    }

    return NextResponse.json({
      ...recipe,
      id: savedRecipe?.id
    });
  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Errore interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
