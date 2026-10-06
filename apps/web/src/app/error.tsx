'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button, buttonClasses } from '@/components/ui/Button';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Solo in console: lo stack non viene mai mostrato all'utente.
    console.error('[app-error]', error.digest ?? '', error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center bg-[#0a0a0a] px-6 text-center text-white">
      <div className="space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
          <AlertTriangle className="h-8 w-8 text-red-400" aria-hidden />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mx-auto max-w-md text-white/60">An unexpected error occurred. Please try again — if it keeps happening, come back in a few minutes.</p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={reset}>Try again</Button>
          <Link href="/dashboard" className={buttonClasses('secondary', 'lg')}>← Back to Dashboard</Link>
        </div>
      </div>
    </main>
  );
}
