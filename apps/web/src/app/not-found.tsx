import type { Metadata } from 'next';
import Link from 'next/link';
import { ChefHat } from 'lucide-react';
import { buttonClasses } from '@/components/ui/Button';

export const metadata: Metadata = { title: 'Page not found', robots: { index: false } };

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0a0a0a] px-6 text-center text-white">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden />
      <div className="relative space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-500/20 bg-emerald-500/10">
          <ChefHat className="h-10 w-10 text-emerald-400" aria-hidden />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">404</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Page not found</h1>
        <p className="mx-auto max-w-md text-white/60">This page doesn&apos;t exist. Let&apos;s get you back to cooking.</p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/dashboard" className={buttonClasses('primary', 'lg')}>← Back to Dashboard</Link>
          <Link href="/" className={buttonClasses('secondary', 'lg')}>Go to Home</Link>
        </div>
      </div>
    </main>
  );
}
