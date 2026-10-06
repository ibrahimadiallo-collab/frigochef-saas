import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabase/server';
import { estimateExpiration, computeFreshness } from '@/lib/freshness';
import { firstZodMessage, scanConfirmSchema } from '@/lib/validation';
import { jsonError, readJson, serverError, unauthorized } from '@/lib/api';
import type { IngredientCategory } from '@/types';

export const dynamic = 'force-dynamic';

interface ExistingRow {
  id: string;
  name: string;
  quantity: number | null;
}

/** Conferma gli ingredienti di uno scan e li salva (upsert per nome) in `pantry_items`. */
export async function POST(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();
    const { supabase, user } = auth;

    const parsed = scanConfirmSchema.safeParse(await readJson(req));
    if (!parsed.success) return jsonError(firstZodMessage(parsed.error));
    const { scanId, ingredients } = parsed.data;

    // Unisce eventuali duplicati nella richiesta stessa.
    const merged = new Map<string, (typeof ingredients)[number] & { name: string }>();
    for (const ing of ingredients) {
      const key = ing.name.trim().toLowerCase();
      const prev = merged.get(key);
      if (prev) {
        prev.quantity = (prev.quantity ?? 0) + (ing.quantity ?? 0) || null;
      } else {
        merged.set(key, { ...ing, name: key });
      }
    }

    const { data: existing, error: fetchError } = await supabase
      .from('pantry_items')
      .select('id, name, quantity')
      .eq('user_id', user.id)
      .returns<ExistingRow[]>();
    if (fetchError) throw fetchError;
    const byName = new Map((existing ?? []).map((row) => [row.name.toLowerCase(), row]));

    const now = new Date();
    const inserts: Record<string, unknown>[] = [];
    let savedCount = 0;

    for (const [key, ing] of merged) {
      const current = byName.get(key);
      if (current) {
        // Già in dispensa: somma la quantità e rinnova la stima di scadenza.
        const category: IngredientCategory = ing.category ?? 'other';
        const quantity =
          current.quantity !== null || ing.quantity != null ? (current.quantity ?? 0) + (ing.quantity ?? 0) : null;
        const expiration = estimateExpiration(category, now);
        const { error } = await supabase
          .from('pantry_items')
          .update({
            quantity,
            ...(ing.unit ? { unit: ing.unit } : {}),
            estimated_expiration: expiration,
            freshness_status: computeFreshness({ estimated_expiration: expiration, category }, now),
          })
          .eq('id', current.id);
        if (error) throw error;
        savedCount += 1;
      } else {
        const category: IngredientCategory = ing.category ?? 'other';
        const expiration = estimateExpiration(category, now);
        inserts.push({
          user_id: user.id,
          name: key,
          quantity: ing.quantity ?? null,
          unit: ing.unit ?? null,
          category,
          estimated_expiration: expiration,
          freshness_status: computeFreshness({ estimated_expiration: expiration, category }, now),
          source: 'scan',
          confidence: ing.confidence ?? 1,
        });
      }
    }

    if (inserts.length) {
      const { error } = await supabase.from('pantry_items').insert(inserts);
      if (error) throw error;
      savedCount += inserts.length;
    }

    if (scanId) {
      const { error } = await supabase
        .from('scan_sessions')
        .update({ status: 'confirmed', confirmed_ingredients: [...merged.values()] })
        .eq('id', scanId)
        .eq('user_id', user.id);
      if (error) console.error('[api:scan-confirm] could not update scan session', error.message);
    }

    return NextResponse.json({ success: true, savedCount });
  } catch (error) {
    return serverError('scan-confirm', error, 'We could not save your ingredients. Please try again.');
  }
}
