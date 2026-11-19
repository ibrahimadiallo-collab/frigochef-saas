import { NextResponse } from 'next/server';
import { analyzeFridgeImage } from '@/lib/vision';
import { checkRateLimit } from '@/lib/rate-limit';
import { verifyAndConsumeAIQuota } from '@/lib/quotas';

export const dynamic = 'force-dynamic';

// Limite 5 MB immagine (~6.8M caratteri in Base64)
const MAX_BASE64_LENGTH = 6_800_000;

export async function POST(req: Request) {
  try {
    const rate = checkRateLimit(req, 'vision', 6, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Troppi tentativi. Riprova tra ${rate.retryAfterSeconds} secondi.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const image = typeof body.image === 'string' ? body.image : '';

    if (!image) {
      return NextResponse.json({ error: 'Immagine mancante' }, { status: 400 });
    }

    if (!image.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Formato file non valido. Carica un file immagine (JPEG, PNG o WebP).' },
        { status: 400 }
      );
    }

    if (image.length > MAX_BASE64_LENGTH) {
      return NextResponse.json(
        { error: "L'immagine supera il limite massimo di 5 MB. Riduci la risoluzione e riprova." },
        { status: 413 }
      );
    }

    // Controllo quote mensili Free (3/mese) vs Plus (50/mese) con autenticazione obbligatoria
    const quota = await verifyAndConsumeAIQuota(req, 'vision');
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

    const items = await analyzeFridgeImage(image);
    return NextResponse.json({
      items,
      quota: {
        remaining: quota.remaining,
        limit: quota.limit,
        isPro: quota.isPro,
      },
    });
  } catch (error: unknown) {
    console.error('Vision API Error:', error);
    const message =
      error instanceof Error ? error.message : "Errore durante l'analisi dell'immagine";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
