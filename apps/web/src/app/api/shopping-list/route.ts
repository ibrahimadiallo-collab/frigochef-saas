import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabase/server';
import { shoppingItemInputSchema, firstZodMessage } from '@/lib/validation';
import { jsonError, readJson, serverError, unauthorized } from '@/lib/api';
import { SHOPPING_COLUMNS, sortByCategory } from '@/lib/shopping';
import type { ShoppingItem } from '@/types';

export const dynamic = 'force-dynamic';

/** GET → `{ items }` ordinati per categoria. */
export async function GET(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();
    const { data, error } = await auth.supabase
      .from('shopping_list_items')
      .select(SHOPPING_COLUMNS)
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: true })
      .returns<ShoppingItem[]>();
    if (error) throw error;
    return NextResponse.json({ items: sortByCategory(data ?? []) });
  } catch (error) {
    return serverError('shopping-get', error, 'Could not load your shopping list.');
  }
}

/** POST `{ name, quantity?, unit?, category }` → `{ item }`. */
export async function POST(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();
    const parsed = shoppingItemInputSchema.safeParse(await readJson(req));
    if (!parsed.success) return jsonError(firstZodMessage(parsed.error));
    const { name, quantity, unit, category, recipeId } = parsed.data;
    const { data, error } = await auth.supabase
      .from('shopping_list_items')
      .insert({ user_id: auth.user.id, name, quantity: quantity ?? null, unit: unit ?? null, category, recipe_id: recipeId ?? null })
      .select(SHOPPING_COLUMNS)
      .single<ShoppingItem>();
    if (error) throw error;
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    return serverError('shopping-post', error, 'Could not add this item.');
  }
}

/** DELETE ?checked=true → rimuove gli elementi completati. */
export async function DELETE(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();
    if (new URL(req.url).searchParams.get('checked') !== 'true') return jsonError('Only completed items can be cleared in bulk.');
    const { error, count } = await auth.supabase
      .from('shopping_list_items')
      .delete({ count: 'exact' })
      .eq('user_id', auth.user.id)
      .eq('checked', true);
    if (error) throw error;
    return NextResponse.json({ deleted: count ?? 0 });
  } catch (error) {
    return serverError('shopping-clear', error, 'Could not clear completed items.');
  }
}
