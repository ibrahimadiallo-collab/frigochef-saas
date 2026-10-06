import { NextResponse } from 'next/server';
import { availableProviders } from '@/lib/ai-providers';

export const dynamic = 'force-dynamic';

/** Health check: non espone valori, solo se i servizi sono configurati. */
export function GET() {
  return NextResponse.json({
    status: 'ok',
    services: {
      supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      ai: availableProviders(),
      stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    },
    timestamp: new Date().toISOString(),
  });
}
