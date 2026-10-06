import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext } from '@/lib/supabase/server';
import { computeFreshness, estimateExpiration } from '@/lib/freshness';
import { firstZodMessage, pantryItemUpdateSchema } from '@/lib/validation';
import { jsonError, readJson, serverError, unauthorized } from '@/lib/api';
import type { PantryItem } from '@/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };
const idSchema = z.string().uuid();

export async function PUT(req: Request, { params }: Params) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();
    const { id } = await params;
    if (!idSchema.safeParse(id).success) return jsonError('Ingredient not found.', 404);

    const parsed = pantryItemUpdateSchema.safeParse(await readJson(req));
    if (!parsed.success) return jsonError(firstZodMessage(parsed.error));
    const input = parsed.data;

    const update: Record<string, unknown> = {};
    if (input.name !== undefined) update.name = input.name.toLowerCase();
    if (input.quantity !== undefined) update.quantity = input.quantity;
    if (input.unit !== undefined) update.unit = input.unit;
    if (input.notes !== undefined) update.notes = input.notes;
    if (input.category !== undefined) update.category = input.category;
    if (input.estimated_expiration !== undefined) update.estimated_expiration = input.estimated_expiration;
    // Cambio categoria senza scadenza esplicita → nuova stima.
    if (input.category !== undefined && input.estimated_expiration === undefined) {
      update.estimated_expiration = estimateExpiration(input.category);
    }
    if (Object.keys(update).length === 0) return jsonError('Nothing to update.');

    const { data, error } = await auth.supabase
      .from('pantry_items')
      .update(update)
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .select('*')
      .maybeSingle<PantryItem>();
    if (error) throw error;
    if (!data) return jsonError('Ingredient not found.', 404);

    const freshness = computeFreshness(data);
    if (freshness !== data.freshness_status) {
      await auth.supabase.from('pantry_items').update({ freshness_status: freshness }).eq('id', id);
    }
    return NextResponse.json({ item: { ...data, freshness_status: freshness } });
  } catch (error) {
    return serverError('pantry-put', error, 'Could not update this ingredient.');
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();
    const { id } = await params;
    if (!idSchema.safeParse(id).success) return jsonError('Ingredient not found.', 404);

    const { data, error } = await auth.supabase
      .from('pantry_items')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .select('id');
    if (error) throw error;
    if (!data?.length) return jsonError('Ingredient not found.', 404);

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError('pantry-delete', error, 'Could not delete this ingredient.');
  }
}
