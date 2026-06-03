import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('pantry')
      .select('ingredients')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
      throw error;
    }

    return NextResponse.json({ ingredients: data?.ingredients || [] });
  } catch (error: any) {
    console.error('Pantry GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ingredients } = await req.json();

    const { error } = await supabase
      .from('pantry')
      .upsert({ 
        user_id: user.id, 
        ingredients,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Pantry POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
