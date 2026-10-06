'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogOut, Settings, Sparkles } from 'lucide-react';
import { Logo } from './Logo';
import { SIDEBAR_ITEMS, isActive } from './nav';
import { useLogout } from './useLogout';
import { cn } from '@/lib/cn';

export function Sidebar() {
  const pathname = usePathname();
  const { logout, isLoggingOut } = useLogout();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/5 bg-[#0a0a0a]/95 px-4 py-6 backdrop-blur-xl lg:flex">
      <div className="px-2">
        <Logo href="/dashboard" />
      </div>

      <nav className="mt-10 flex flex-1 flex-col gap-1" aria-label="Main">
        {SIDEBAR_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'text-white' : 'text-white/50 hover:bg-white/5 hover:text-white',
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl border border-emerald-500/20 bg-emerald-500/10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={cn('relative h-5 w-5', active && 'text-emerald-400')} aria-hidden />
              <span className="relative">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-white/5 pt-4">
        <Link
          href="/profile#upgrade"
          className="mb-3 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 px-3 py-3 text-sm font-semibold text-emerald-300 hover:from-emerald-500/30"
        >
          <Sparkles className="h-5 w-5" aria-hidden /> Upgrade to Pro
        </Link>
        <Link
          href="/profile#settings"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/50 hover:bg-white/5 hover:text-white"
        >
          <Settings className="h-5 w-5" aria-hidden /> Settings
        </Link>
        <button
          type="button"
          onClick={logout}
          disabled={isLoggingOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/50 hover:bg-white/5 hover:text-red-300 disabled:opacity-50"
        >
          <LogOut className="h-5 w-5" aria-hidden /> {isLoggingOut ? 'Logging out…' : 'Logout'}
        </button>
      </div>
    </aside>
  );
}
