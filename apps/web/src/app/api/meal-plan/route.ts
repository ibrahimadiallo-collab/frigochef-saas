import { NextResponse } from 'next/server';
import { generateMealPlan } from '@/lib/ai';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const rate = checkRateLimit(req, 'meal-plan', 5, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Troppi tentativi. Riprova tra ${rate.retryAfterSeconds} secondi.` },
        { status: 429 }
      );
    }

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
