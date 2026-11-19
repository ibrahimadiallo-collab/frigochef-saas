import { NextResponse } from 'next/server';
import { supabaseAdmin, getUserFromRequest } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('pantry')
      .select('ingredients, items_detail')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return NextResponse.json({
      ingredients: data?.ingredients || [],
      itemsDetail: data?.items_detail || [],
    });
  } catch (error: unknown) {
    console.error('Pantry GET Error:', error);
    return NextResponse.json({ error: 'Errore nel caricamento della dispensa' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
    }

    const body = await req.json();
    const ingredients = Array.isArray(body.ingredients)
      ? body.ingredients
          .filter((i: unknown): i is string => typeof i === 'string')
          .map((i: string) => i.trim().slice(0, 60))
          .filter(Boolean)
          .slice(0, 150)
      : [];

    const itemsDetail = Array.isArray(body.itemsDetail) ? body.itemsDetail.slice(0, 150) : undefined;

    const payload: Record<string, unknown> = {
      user_id: user.id,
      ingredients,
      updated_at: new Date().toISOString(),
    };
    if (itemsDetail !== undefined) {
      payload.items_detail = itemsDetail;
    }

    const { error } = await supabaseAdmin
      .from('pantry')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Pantry POST Error:', error);
    return NextResponse.json({ error: 'Errore nel salvataggio della dispensa' }, { status: 500 });
  }
}
