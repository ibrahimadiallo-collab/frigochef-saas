import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext } from '@/lib/supabase/server';
import { computeFreshness, effectiveExpiration, estimateExpiration } from '@/lib/freshness';
import { firstZodMessage, pantryItemInputSchema } from '@/lib/validation';
import { jsonError, readJson, serverError, unauthorized } from '@/lib/api';
import { FRESHNESS_STATUSES, INGREDIENT_CATEGORIES, type PantryItem } from '@/types';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  category: z.enum(INGREDIENT_CATEGORIES).optional(),
  freshness: z.enum(FRESHNESS_STATUSES).optional(),
  search: z.string().trim().max(80).optional(),
  sort: z.enum(['expiration', 'category', 'recent']).default('expiration'),
});

/** Ricalcola sempre la freshness al momento della lettura. */
function withFreshness(item: PantryItem): PantryItem {
  return { ...item, freshness_status: computeFreshness(item) };
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();

    const params = Object.fromEntries(
      [...new URL(req.url).searchParams.entries()].filter(([, v]) => v !== '' && v !== 'all'),
    );
    const query = querySchema.safeParse(params);
    if (!query.success) return jsonError(firstZodMessage(query.error));
    const { category, freshness, search, sort } = query.data;

    let request = auth.supabase.from('pantry_items').select('*').eq('user_id', auth.user.id);
    if (category) request = request.eq('category', category);
    if (search) request = request.ilike('name', `%${search.replace(/[%_]/g, '')}%`);

    const { data, error } = await request.order('added_at', { ascending: false }).returns<PantryItem[]>();
    if (error) throw error;

    let items = (data ?? []).map(withFreshness);
    if (freshness) items = items.filter((i) => i.freshness_status === freshness);

    if (sort === 'expiration') {
      items.sort((a, b) => new Date(effectiveExpiration(a)).getTime() - new Date(effectiveExpiration(b)).getTime());
    } else if (sort === 'category') {
      items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    }

    return NextResponse.json({ items });
  } catch (error) {
    return serverError('pantry-get', error, 'Could not load your pantry.');
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();

    const parsed = pantryItemInputSchema.safeParse(await readJson(req));
    if (!parsed.success) return jsonError(firstZodMessage(parsed.error));
    const input = parsed.data;
    const category = input.category ?? 'other';
    const expiration = input.estimated_expiration ?? estimateExpiration(category);

    const { data, error } = await auth.supabase
      .from('pantry_items')
      .insert({
        user_id: auth.user.id,
        name: input.name.toLowerCase(),
        quantity: input.quantity ?? null,
        unit: input.unit ?? null,
        category,
        estimated_expiration: expiration,
        freshness_status: computeFreshness({ estimated_expiration: expiration, category }),
        source: input.source ?? 'manual',
        confidence: input.confidence ?? 1,
        notes: input.notes ?? null,
      })
      .select('*')
      .single<PantryItem>();
    if (error) throw error;

    return NextResponse.json({ item: withFreshness(data) }, { status: 201 });
  } catch (error) {
    return serverError('pantry-post', error, 'Could not add this ingredient.');
  }
}
