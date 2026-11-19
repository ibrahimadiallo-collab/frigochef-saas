import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const createSafeSupabaseClient = () => {
  const realClient =
    supabaseUrl && supabaseAnonKey
      ? createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            fetch: async (url, options) => {
              try {
                return await fetch(url, options);
              } catch {
                return new Response(
                  JSON.stringify({ message: 'Servizio di autenticazione temporaneamente non raggiungibile.' }),
                  { status: 503, headers: { 'Content-Type': 'application/json' } }
                );
              }
            },
          },
        })
      : null;

  return {
    auth: {
      getSession: async () => {
        if (!realClient) return { data: { session: null }, error: null };
        try {
          return await realClient.auth.getSession();
        } catch {
          return { data: { session: null }, error: null };
        }
      },
      onAuthStateChange: (callback: (event: any, session: any) => void) => {
        if (!realClient) {
          return { data: { subscription: { unsubscribe: () => {} } } };
        }
        return realClient.auth.onAuthStateChange(callback);
      },
      getUser: async () => {
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
          return await realClient.auth.signInWithOtp(params);
        } catch {
          return {
            data: { user: null, session: null },
            error: { message: 'Impossibile connettersi al server di autenticazione.' },
          };
        }
      },
      signInWithPassword: async (params: { email: string; password: string }) => {
        if (!realClient) {
          return { data: { user: null, session: null }, error: { message: 'Supabase non configurato' } };
        }
        try {
          return await realClient.auth.signInWithPassword(params);
        } catch {
          return {
            data: { user: null, session: null },
            error: { message: 'Impossibile connettersi al server di autenticazione.' },
          };
        }
      },
      signUp: async (params: { email: string; password: string; options?: any }) => {
        if (!realClient) {
          return { data: { user: null, session: null }, error: { message: 'Supabase non configurato' } };
        }
        try {
          return await realClient.auth.signUp(params);
        } catch {
          return {
            data: { user: null, session: null },
            error: { message: 'Impossibile completare la registrazione.' },
          };
        }
      },
      resetPasswordForEmail: async (email: string, options?: any) => {
        if (!realClient) {
          return { data: null, error: { message: 'Supabase non configurato' } };
        }
        try {
          return await realClient.auth.resetPasswordForEmail(email, options);
        } catch {
          return { data: null, error: { message: 'Impossibile inviare email di recupero.' } };
        }
      },
      signInWithOAuth: async (params: { provider: 'google'; options?: any }) => {
        if (!realClient || !supabaseUrl || !supabaseAnonKey) {
          return { data: { provider: 'google', url: null }, error: { message: 'Supabase non configurato' } };
        }
        try {
          const settingsRes = await fetch(`${supabaseUrl}/auth/v1/settings`, {
            headers: { apikey: supabaseAnonKey },
          });
          if (!settingsRes.ok) {
            return {
              data: { provider: 'google', url: null },
              error: { message: 'Server di autenticazione Supabase in pausa o non raggiungibile.' },
            };
          }
          const settings = await settingsRes.json();
          if (!settings?.external?.google) {
            return {
              data: { provider: 'google', url: null },
              error: { message: 'L’accesso con Google non è ancora stato abilitato nel pannello Supabase (Authentication → Providers → Google). Usa l’accesso con Email.' },
            };
          }

          return await realClient.auth.signInWithOAuth({
            ...params,
            options: {
              ...params.options,
              skipBrowserRedirect: true,
            },
          });
        } catch {
          return {
            data: { provider: 'google', url: null },
            error: { message: 'Impossibile contattare il provider Google OAuth.' },
          };
        }
      },
      signOut: async () => {
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
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  } catch {
    return {};
  }
}
