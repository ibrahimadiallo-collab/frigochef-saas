import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext } from '@/lib/supabase/server';
import { shoppingItemUpdateSchema, firstZodMessage } from '@/lib/validation';
import { jsonError, readJson, serverError, unauthorized } from '@/lib/api';
import { SHOPPING_COLUMNS } from '@/lib/shopping';
import type { ShoppingItem } from '@/types';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };
const idSchema = z.string().uuid();

/** PUT `{ name?, quantity?, unit?, checked?, category? }` → `{ item }`. */
export async function PUT(req: Request, { params }: Ctx) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();
    const { id } = await params;
    if (!idSchema.safeParse(id).success) return jsonError('Item not found.', 404);
    const parsed = shoppingItemUpdateSchema.safeParse(await readJson(req));
    if (!parsed.success) return jsonError(firstZodMessage(parsed.error));

    const { data, error } = await auth.supabase
      .from('shopping_list_items')
      .update(parsed.data)
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .select(SHOPPING_COLUMNS)
      .maybeSingle<ShoppingItem>();
    if (error) throw error;
    if (!data) return jsonError('Item not found.', 404);
    return NextResponse.json({ item: data });
  } catch (error) {
    return serverError('shopping-put', error, 'Could not update this item.');
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();
    const { id } = await params;
    if (!idSchema.safeParse(id).success) return jsonError('Item not found.', 404);
    const { error, count } = await auth.supabase
      .from('shopping_list_items')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('user_id', auth.user.id);
    if (error) throw error;
    if (!count) return jsonError('Item not found.', 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError('shopping-delete', error, 'Could not delete this item.');
  }
}
