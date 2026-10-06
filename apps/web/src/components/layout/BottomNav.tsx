'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { BOTTOM_NAV_ITEMS, isActive } from './nav';
import { cn } from '@/lib/cn';

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0a0a0a]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-6">
        {BOTTOM_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'relative flex flex-col items-center gap-1 py-2.5 text-[10px] min-[400px]:text-[11px] font-medium',
                  active ? 'text-emerald-400' : 'text-white/45',
                )}
              >
                {active && (
                  <motion.span layoutId="bottom-active" className="absolute top-0 h-0.5 w-8 rounded-full bg-emerald-400" />
                )}
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
