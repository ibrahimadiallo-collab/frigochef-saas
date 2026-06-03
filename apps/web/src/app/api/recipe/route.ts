import { NextResponse } from 'next/server';
import { generateRecipe } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    const { ingredients, mealType, time } = await req.json();

    if (!ingredients) {
      return NextResponse.json({ error: 'Ingredienti mancanti' }, { status: 400 });
    }

    const recipe = await generateRecipe(ingredients, mealType, time);
    return NextResponse.json(recipe);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Errore interno' }, { status: 500 });
  }
}
