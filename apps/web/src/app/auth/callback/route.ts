import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * Valida il parametro `next` per impedire attacchi di Open Redirect verso domini esterni.
 */
function safeNextPath(rawNext: string | null): string {
  if (!rawNext) return '/';
  const trimmed = rawNext.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) {
    return '/';
  }
  return trimmed;
}

/**
 * GET /auth/callback
 * Passo 9 — Gestione callback OAuth (Google PKCE) e verifica link email con protezione Open Redirect.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const errorParam = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');
  const nextPath = safeNextPath(url.searchParams.get('next'));

  if (errorParam) {
    const target = new URL('/', url.origin);
    target.searchParams.set(
      'auth_error',
      errorDescription || 'Accesso annullato o non riuscito.'
    );
    return NextResponse.redirect(target);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (code && supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await supabase.auth.exchangeCodeForSession(code);
    } catch (err) {
      console.error('Auth callback exchange error:', err);
    }
  }

  return NextResponse.redirect(new URL(nextPath, url.origin));
}
