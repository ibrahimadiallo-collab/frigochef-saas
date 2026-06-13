import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Se le chiavi mancano (es. durante la build su Vercel), creiamo un proxy che non crasha
// ma restituisce funzioni vuote o oggetti nulli.
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({} as any, {
      get: () => new Proxy(() => ({}), {
        get: () => () => ({ data: { session: null, user: null }, error: null })
      })
    });

// Client helper: Authorization header costruito dalla sessione corrente del browser.
export async function authHeader(): Promise<Record<string, string>> {
  if (!supabaseUrl || !supabaseAnonKey) return {};
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session ? { Authorization: `Bearer ${session.access_token}` } : {};
  } catch {
    return {};
  }
}
