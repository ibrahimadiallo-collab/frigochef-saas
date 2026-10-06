import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Logo } from '@/components/layout/Logo';
import { PageTransition } from '@/components/layout/PageTransition';
import { ReferralAutoClaim } from '@/components/referral/ReferralAutoClaim';

/** Shell dell'app autenticata: sidebar su desktop, bottom nav su mobile. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-gradient-to-b from-emerald-500/[0.07] to-transparent" aria-hidden />
      <Sidebar />
      <header className="sticky top-0 z-20 flex h-14 items-center border-b border-white/5 bg-[#0a0a0a]/80 px-4 backdrop-blur-xl lg:hidden">
        <Logo href="/dashboard" />
      </header>
      <main className="relative pb-28 lg:pb-12 lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
      <BottomNav />
      <ReferralAutoClaim />
    </div>
  );
}
