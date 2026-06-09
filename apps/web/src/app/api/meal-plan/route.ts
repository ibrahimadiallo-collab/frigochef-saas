import { NextResponse } from 'next/server';
import { generateMealPlan } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    const { ingredients } = await req.json();

    if (!ingredients) {
      return NextResponse.json({ error: 'Ingredienti mancanti' }, { status: 400 });
    }

    const plan = await generateMealPlan(ingredients);
    return NextResponse.json(plan);
  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Errore interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
