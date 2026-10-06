'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Logo } from '@/components/layout/Logo';

/** Card scura centrata usata da login e signup. */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 py-12 text-white">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111827] p-8 shadow-2xl shadow-emerald-500/5"
      >
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-center text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-center text-sm text-white/60">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </motion.div>
    </main>
  );
}
