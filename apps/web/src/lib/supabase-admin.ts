import { createClient } from '@supabase/supabase-js';

// ⚠️ SERVER-ONLY. Non importare mai in un client component:
// usa la SERVICE_ROLE_KEY che bypassa la Row Level Security.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Valida il Bearer token della richiesta e restituisce l'utente (o null).
export async function getUserFromRequest(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  return error ? null : user;
}
