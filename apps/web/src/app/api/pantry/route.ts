import { NextResponse } from 'next/server';
import { supabaseAdmin, getUserFromRequest } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// Fallback in-memory per sviluppo locale / modalità Demo quando Supabase è in pausa
const localPantryStore = new Map<string, string[]>();

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    const userKey = user?.id || 'guest';

    if (user && user.id !== 'demo-user-id') {
      const { data, error } = await supabaseAdmin
        .from('pantry')
        .select('ingredients')
        .eq('user_id', user.id)
        .single();

      if (!error && data?.ingredients) {
        return NextResponse.json({ ingredients: data.ingredients });
      }
    }

    return NextResponse.json({ ingredients: localPantryStore.get(userKey) || [] });
  } catch {
    return NextResponse.json({ ingredients: localPantryStore.get('guest') || [] });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    const userKey = user?.id || 'guest';
    const { ingredients } = await req.json();

    if (Array.isArray(ingredients)) {
      localPantryStore.set(userKey, ingredients);
      localPantryStore.set('guest', ingredients);
    }

    if (user && user.id !== 'demo-user-id') {
      await supabaseAdmin
        .from('pantry')
        .upsert(
          {
            user_id: user.id,
            ingredients,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
