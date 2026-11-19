import { NextResponse } from 'next/server';
import { generateRecipe } from '@/lib/ai';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit } from '@/lib/rate-limit';
import { verifyAndConsumeAIQuota } from '@/lib/quotas';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Rate limiting anti-burst (max 10 richieste/minuto per IP)
    const rate = checkRateLimit(req, 'recipe', 10, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Troppi tentativi ravvicinati. Riprova tra ${rate.retryAfterSeconds} secondi.` },
        { status: 429 }
      );
    }

    // 2. Validazione dati in ingresso
    const body = await req.json();
    const rawIngredients = typeof body.ingredients === 'string' ? body.ingredients.trim() : '';
    if (!rawIngredients || rawIngredients.length < 2) {
      return NextResponse.json({ error: 'Inserisci almeno 2 ingredienti validi.' }, { status: 400 });
    }
    if (rawIngredients.length > 600) {
      return NextResponse.json(
        { error: 'Lista ingredienti troppo lunga (massimo 600 caratteri).' },
        { status: 400 }
      );
    }

    const mealType = typeof body.mealType === 'string' ? body.mealType.slice(0, 30) : 'cena';
    const time = typeof body.time === 'string' ? body.time.slice(0, 30) : 'normale';
    const dietaryPreferences = Array.isArray(body.dietaryPreferences)
      ? body.dietaryPreferences.filter((x: unknown): x is string => typeof x === 'string').slice(0, 10)
      : [];
    const allergens = Array.isArray(body.allergens)
      ? body.allergens.filter((x: unknown): x is string => typeof x === 'string').slice(0, 10)
      : [];

    // 3. Controllo quote giornaliere Free (3/giorno) vs Plus (50/giorno) con autenticazione obbligatoria
    const quota = await verifyAndConsumeAIQuota(req, 'recipe');
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

    // 4. Generazione Ricetta AI con timeout
    const recipe = await generateRecipe(rawIngredients, mealType, time, dietaryPreferences, allergens);

    const slug =
      recipe.nome
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '') +
      '-' +
      Math.random().toString(36).substring(2, 7);

    let savedId: string | undefined;
    if (quota.userId) {
      const { data: savedRecipe } = await supabaseAdmin
        .from('recipes')
        .insert([
          {
            user_id: quota.userId,
            recipe_data: recipe,
            slug,
            is_public: true,
          },
        ])
        .select('id')
        .single();
      savedId = savedRecipe?.id;
    }

    return NextResponse.json({
      ...recipe,
      id: savedId,
      quota: {
        remaining: quota.remaining,
        limit: quota.limit,
        isPro: quota.isPro,
      },
    });
  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Errore interno durante la generazione';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
