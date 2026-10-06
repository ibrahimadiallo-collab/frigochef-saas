import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabase/server';
import { shoppingBulkSchema, firstZodMessage } from '@/lib/validation';
import { jsonError, readJson, serverError, unauthorized } from '@/lib/api';
import { SHOPPING_COLUMNS } from '@/lib/shopping';
import type { ShoppingItem } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * PATCH `{ items: [...] }` → aggiunge più elementi (da meal plan o ricetta).
 * Salta gli elementi già presenti e non completati con lo stesso nome.
 */
export async function PATCH(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();
    const parsed = shoppingBulkSchema.safeParse(await readJson(req));
    if (!parsed.success) return jsonError(firstZodMessage(parsed.error));

    const { data: existing, error: existingError } = await auth.supabase
      .from('shopping_list_items')
      .select('name')
      .eq('user_id', auth.user.id)
      .eq('checked', false)
      .returns<{ name: string }[]>();
    if (existingError) throw existingError;

    const seen = new Set((existing ?? []).map((e) => e.name.trim().toLowerCase()));
    const rows = [];
    for (const item of parsed.data.items) {
      const key = item.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        user_id: auth.user.id,
        name: item.name,
        quantity: item.quantity ?? null,
        unit: item.unit ?? null,
        category: item.category,
        recipe_id: item.recipeId ?? null,
      });
    }

    if (rows.length === 0) return NextResponse.json({ items: [], added: 0, skipped: parsed.data.items.length });

    const { data, error } = await auth.supabase.from('shopping_list_items').insert(rows).select(SHOPPING_COLUMNS).returns<ShoppingItem[]>();
    if (error) throw error;
    return NextResponse.json({ items: data ?? [], added: data?.length ?? 0, skipped: parsed.data.items.length - rows.length }, { status: 201 });
  } catch (error) {
    return serverError('shopping-bulk', error, 'Could not add these items to your shopping list.');
  }
}
