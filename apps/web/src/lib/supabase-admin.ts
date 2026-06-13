import 'server-only';
import { createClient } from '@supabase/supabase-js';

// ⚠️ SERVER-ONLY. Grazie a 'server-only', Next.js darà errore se questo 
// file viene importato in un Client Component, proteggendo la SERVICE_ROLE_KEY.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAdmin = (supabaseUrl && serviceRoleKey)
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  : new Proxy({} as Record<string, unknown>, {
      get: () => new Proxy(() => ({}), {
        get: () => () => ({ data: { user: null }, error: null })
      })
    });

/**
 * Valida il Bearer token della richiesta e restituisce l'utente (o null).
 * Utilizzato nelle API Route per identificare chi sta chiamando.
 */
export async function getUserFromRequest(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!token) return null;

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) return null;
    return user;
  } catch (err) {
    console.error('Auth verification failed:', err);
    return null;
  }
}
