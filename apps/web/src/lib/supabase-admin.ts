import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const createSafeAdminClient = (): SupabaseClient => {
  if (supabaseUrl && serviceRoleKey) {
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        fetch: async (url, options) => {
          try {
            return await fetch(url, options);
          } catch {
            return new Response(
              JSON.stringify({ message: 'Supabase non raggiungibile' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          }
        },
      },
    });
  }

  const dummyChain = {
    select: () => dummyChain,
    eq: () => dummyChain,
    gte: async () => ({ count: 0, data: [], error: null }),
    order: () => ({ data: [], error: null }),
    limit: async () => ({ data: [], error: null }),
    single: async () => ({ data: null, error: null }),
    upsert: async () => ({ data: null, error: null }),
    insert: () => ({
      select: () => ({
        single: async () => ({ data: null, error: null }),
      }),
    }),
    update: () => ({
      eq: () => ({
        select: async () => ({ data: [], error: null }),
      }),
    }),
    delete: () => ({
      eq: async () => ({ data: null, error: null }),
    }),
  };

  return {
    rpc: async () => ({
      data: null,
      error: { code: 'PGRST202', message: 'Supabase Admin non configurato' },
    }),
    from: () => dummyChain,
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      admin: {
        deleteUser: async () => ({ data: null, error: null }),
      },
    },
  } as unknown as SupabaseClient;
};

export const supabaseAdmin = createSafeAdminClient();

/**
 * Verifica rigorosa del token JWT tramite Supabase Auth.
 * Nessun token fittizio (es. demo-token) viene mai accettato dal server.
 */
export async function getUserFromRequest(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

    if (!token || token === 'demo-token' || token.length < 20) return null;
    if (!supabaseAdmin.auth) return null;

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) return null;
    return user;
  } catch (err) {
    console.error('Auth verification failed:', err);
    return null;
  }
}
