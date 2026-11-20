import { NextResponse } from 'next/server';
import { generateMealPlan } from '@/lib/ai';
import { checkRateLimit } from '@/lib/rate-limit';
import { verifyAndConsumeAIQuota } from '@/lib/quotas';

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

    const body = await req.json();
    const rawIngredients = typeof body.ingredients === 'string' ? body.ingredients.trim() : '';
    if (!rawIngredients || rawIngredients.length < 2) {
      return NextResponse.json({ error: 'Ingredienti mancanti' }, { status: 400 });
    }
    if (rawIngredients.length > 600) {
      return NextResponse.json(
        { error: 'Lista ingredienti troppo lunga (massimo 600 caratteri).' },
        { status: 400 }
      );
    }

    const dietaryPreferences = Array.isArray(body.dietaryPreferences)
      ? body.dietaryPreferences.filter((x: unknown): x is string => typeof x === 'string').slice(0, 10)
      : [];
    const allergens = Array.isArray(body.allergens)
      ? body.allergens.filter((x: unknown): x is string => typeof x === 'string').slice(0, 10)
      : [];

    // Controllo quote mensili Free (1/mese) vs Plus (4/mese) con autenticazione obbligatoria
    const quota = await verifyAndConsumeAIQuota(req, 'meal_plan');
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: quota.errorMessage,
          quotaExceeded: quota.statusCode === 429,
          unauthenticated: quota.statusCode === 401,
          isPro: quota.isPro,
        },
        { status: quota.statusCode || 429 }
      );
    }

    const plan = await generateMealPlan(rawIngredients, dietaryPreferences, allergens);
    return NextResponse.json(plan);
  } catch (error: unknown) {
    console.error('Meal Plan API Error:', error);
    return NextResponse.json(
      { error: 'Impossibile generare il piano settimanale in questo momento. Riprova tra poco.' },
      { status: 500 }
    );
  }
}
