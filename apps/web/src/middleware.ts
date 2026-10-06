import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Esclude asset statici, immagini e webhook Stripe (che deve ricevere il body raw senza redirect).
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
