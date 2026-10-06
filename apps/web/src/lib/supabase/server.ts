import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient as createJsClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Supabase is not configured.');
  }
  return { url, anonKey };
}

/** Client Supabase server-side (Server Components, Route Handlers) legato ai cookie dell'utente. */
export async function createClient(): Promise<SupabaseClient> {
  const { url, anonKey } = getEnv();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chiamato da un Server Component: i cookie vengono aggiornati dal middleware.
        }
      },
    },
  });
}

export interface AuthContext {
  user: User;
  supabase: SupabaseClient;
}

/**
 * Restituisce utente + client RLS. Supporta sia la sessione via cookie (web app)
 * sia l'header `Authorization: Bearer <jwt>` (client legacy / mobile).
 */
export async function getAuthContext(req?: Request): Promise<AuthContext | null> {
  try {
    const bearer = req?.headers.get('authorization');
    if (bearer?.startsWith('Bearer ')) {
      const token = bearer.slice(7);
      const { url, anonKey } = getEnv();
      const supabase = createJsClient(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) return { user: data.user, supabase };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return { user: data.user, supabase };
  } catch (err) {
    console.error('[auth] verification failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
