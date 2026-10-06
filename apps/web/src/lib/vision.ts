import 'server-only';
import { extractJson } from './ai-json';
import { runWithFallback, type ImageInput } from './ai-providers';
import { detectedIngredientSchema, normalizeCategory } from './validation';
import type { AiProvider, DetectedIngredient } from '@/types';

const SCAN_PROMPT = `Analyze this fridge/pantry image and return a JSON object with this exact structure:
{
  "ingredients": [
    { "name": "string", "quantity": number|null, "unit": "string|null", "category": "vegetable|fruit|meat|fish|dairy|grain|condiment|beverage|other", "confidence": number }
  ]
}
Rules:
- Use short, generic English ingredient names in singular form (e.g. "egg", "milk", "tomato").
- confidence is between 0 and 1.
- Only include edible items. Merge duplicates.
Return ONLY the JSON, no markdown, no explanation.`;

/** Ridimensiona a max 1024px (lato lungo) e converte in JPEG. Se sharp non è disponibile, passa l'originale. */
export async function prepareImage(buffer: Buffer, mimeType: string): Promise<ImageInput> {
  try {
    const sharp = (await import('sharp')).default;
    const resized = await sharp(buffer)
      .rotate()
      .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    return { base64: resized.toString('base64'), mimeType: 'image/jpeg' };
  } catch (err) {
    console.warn('[vision] sharp unavailable, sending original image:', err instanceof Error ? err.message : err);
    const allowed: ImageInput['mimeType'][] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const safeMime = (allowed as string[]).includes(mimeType) ? (mimeType as ImageInput['mimeType']) : 'image/jpeg';
    return { base64: buffer.toString('base64'), mimeType: safeMime };
  }
}

/** Valida e normalizza la lista grezza; deduplica per nome. */
export function parseDetectedIngredients(raw: unknown): DetectedIngredient[] {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { ingredients?: unknown }).ingredients)
      ? (raw as { ingredients: unknown[] }).ingredients
      : [];

  const byName = new Map<string, DetectedIngredient>();
  for (const entry of list) {
    const parsed = detectedIngredientSchema.safeParse(entry);
    if (!parsed.success) continue;
    const item = parsed.data;
    if (!byName.has(item.name)) byName.set(item.name, item);
  }
  return [...byName.values()];
}

/** Recovery estremo: estrae coppie "name": "..." dal testo se il JSON è irrecuperabile. */
function regexRecover(text: string): DetectedIngredient[] {
  const names = [...text.matchAll(/"name"\s*:\s*"([^"]{1,80})"/g)].map((m) => m[1].trim().toLowerCase());
  return [...new Set(names)].map((name) => ({
    name,
    quantity: null,
    unit: null,
    category: normalizeCategory(null),
    confidence: 0.5,
  }));
}

export async function analyzeFridgeImage(
  image: ImageInput,
): Promise<{ ingredients: DetectedIngredient[]; provider: AiProvider }> {
  const { text, provider } = await runWithFallback(['gemini', 'claude'], SCAN_PROMPT, { image });
  const json = extractJson(text);
  let ingredients = json ? parseDetectedIngredients(json) : [];
  if (ingredients.length === 0) ingredients = regexRecover(text);
  return { ingredients, provider };
}
