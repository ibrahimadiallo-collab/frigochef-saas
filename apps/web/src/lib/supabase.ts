import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const DEMO_STORAGE_KEY = 'fc_demo_user';

function getDemoSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    return {
      access_token: 'demo-token',
      user,
    };
  } catch {
    return null;
  }
}

// Implementazione resiliente che non va in crash se il progetto Supabase è in pausa o offline
const createSafeSupabaseClient = () => {
  const realClient =
    supabaseUrl && supabaseAnonKey
      ? createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            fetch: async (url, options) => {
              try {
                return await fetch(url, options);
              } catch {
                // Restituisce una risposta 503 pulita invece di lanciare TypeError: Failed to fetch
                return new Response(
                  JSON.stringify({ message: 'Servizio Supabase non raggiungibile (progetto in pausa o offline).' }),
                  { status: 503, headers: { 'Content-Type': 'application/json' } }
                );
              }
            },
          },
        })
      : null;

  const authListeners = new Set<(event: string, session: any) => void>();

  return {
    auth: {
      getSession: async () => {
        const demo = getDemoSession();
        if (demo) return { data: { session: demo }, error: null };
        if (!realClient) return { data: { session: null }, error: null };
        try {
          return await realClient.auth.getSession();
        } catch {
          return { data: { session: null }, error: null };
        }
      },
      onAuthStateChange: (callback: (event: any, session: any) => void) => {
        authListeners.add(callback);
        if (!realClient) {
          return { data: { subscription: { unsubscribe: () => authListeners.delete(callback) } } };
        }
        const { data } = realClient.auth.onAuthStateChange(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                authListeners.delete(callback);
                data.subscription.unsubscribe();
              },
            },
          },
        };
      },
      getUser: async () => {
        const demo = getDemoSession();
        if (demo) return { data: { user: demo.user }, error: null };
        if (!realClient) return { data: { user: null }, error: null };
        try {
          return await realClient.auth.getUser();
        } catch {
          return { data: { user: null }, error: null };
        }
      },
      signInWithOtp: async (params: { email: string; options?: any }) => {
        if (!realClient) {
          return { data: { user: null, session: null }, error: { message: 'Supabase non configurato' } };
        }
        try {
          const res = await realClient.auth.signInWithOtp(params);
          return res;
        } catch {
          return {
            data: { user: null, session: null },
            error: { message: 'Impossibile connettersi a Supabase (verifica che il progetto non sia in pausa).' },
          };
        }
      },
      signInDemo: (email: string) => {
        const demoUser = {
          id: 'demo-user-id',
          email,
          role: 'authenticated',
          created_at: new Date().toISOString(),
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoUser));
        }
        const session = { access_token: 'demo-token', user: demoUser };
        authListeners.forEach((cb) => cb('SIGNED_IN', session));
        return { data: { user: demoUser, session }, error: null };
      },
      signOut: async () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(DEMO_STORAGE_KEY);
        }
        authListeners.forEach((cb) => cb('SIGNED_OUT', null));
        if (!realClient) return { error: null };
        try {
          return await realClient.auth.signOut();
        } catch {
          return { error: null };
        }
      },
    },
    from: (table: string) => {
      if (realClient) {
        return realClient.from(table);
      }
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
            order: () => ({ data: [], error: null }),
          }),
        }),
        upsert: async () => ({ data: null, error: null }),
      } as any;
    },
  } as any;
};

export const supabase = createSafeSupabaseClient();

export async function authHeader(): Promise<Record<string, string>> {
  if (!supabaseUrl || !supabaseAnonKey) return {};
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session ? { Authorization: `Bearer ${session.access_token}` } : {};
  } catch {
    return {};
  }
}
