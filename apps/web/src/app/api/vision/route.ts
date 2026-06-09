import { NextResponse } from 'next/server';
import { analyzeFridgeImage } from '@/lib/vision';

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'Immagine mancante' }, { status: 400 });
    }

    const items = await analyzeFridgeImage(image);
    return NextResponse.json({ items });
  } catch (error: unknown) {
    console.error('Vision API Error:', error);
    const message = error instanceof Error ? error.message : 'Errore durante l\'analisi dell\'immagine';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
