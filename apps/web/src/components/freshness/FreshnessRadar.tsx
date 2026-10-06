'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Radar } from 'lucide-react';
import type { FreshnessStatus, PantryItem } from '@/types';
import { summarizeFreshness, effectiveExpiration, formatExpiration } from '@/lib/freshness';
import { FRESHNESS_META } from '@/components/ui/FreshnessBadge';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

interface FreshnessRadarProps {
  items: PantryItem[];
  className?: string;
}

const ORDER: FreshnessStatus[] = ['critical', 'soon', 'fresh'];

/** Posizioni deterministiche dei "blip" sul radar: critici al centro, freschi all'esterno. */
const RING_POSITION: Record<FreshnessStatus, string[]> = {
  critical: ['top-[42%] left-[46%]', 'top-[52%] left-[54%]', 'top-[46%] left-[56%]', 'top-[55%] left-[44%]'],
  soon: ['top-[30%] left-[36%]', 'top-[64%] left-[62%]', 'top-[34%] left-[66%]', 'top-[66%] left-[34%]'],
  fresh: ['top-[16%] left-[50%]', 'top-[80%] left-[48%]', 'top-[50%] left-[16%]', 'top-[48%] left-[82%]'],
};

export function FreshnessRadar({ items, className }: FreshnessRadarProps) {
  const summary = summarizeFreshness(items);
  const attention = summary.critical + summary.soon;
  const urgent = [...items]
    .filter((i) => i.freshness_status !== 'fresh')
    .sort((a, b) => new Date(effectiveExpiration(a)).getTime() - new Date(effectiveExpiration(b)).getTime())
    .slice(0, 4);

  return (
    <Card className={cn('p-5 sm:p-6', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Radar className="h-4 w-4 text-emerald-400" aria-hidden /> Freshness Radar
        </div>
        <Link href="/pantry" className="text-xs text-white/50 hover:text-emerald-300">View pantry</Link>
      </div>

      <div className="mt-5 grid gap-6 sm:grid-cols-[180px_1fr] sm:items-center">
        <div className="relative mx-auto aspect-square w-44" aria-hidden>
          {[0, 1, 2].map((ring) => (
            <div
              key={ring}
              className={cn(
                'absolute rounded-full border border-emerald-500/15',
                ring === 0 && 'inset-0',
                ring === 1 && 'inset-[18%]',
                ring === 2 && 'inset-[36%]',
              )}
            />
          ))}
          <motion.div
            className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,rgba(16,185,129,0.35),transparent_25%)]"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
          />
          {ORDER.flatMap((status) =>
            RING_POSITION[status].slice(0, Math.min(summary[status], 4)).map((pos, i) => (
              <motion.span
                key={`${status}-${i}`}
                className={cn('absolute h-2.5 w-2.5 rounded-full shadow-lg', pos, FRESHNESS_META[status].dot)}
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}
              />
            )),
          )}
        </div>

        <div className="space-y-4">
          <p className="text-lg font-semibold text-white">
            {summary.total === 0
              ? 'No ingredients tracked yet'
              : attention === 0
                ? 'Everything looks fresh'
                : `${attention} ingredient${attention === 1 ? '' : 's'} need${attention === 1 ? 's' : ''} attention`}
          </p>

          <div className="grid grid-cols-3 gap-2">
            {ORDER.map((status) => (
              <Link
                key={status}
                href={`/pantry?freshness=${status}`}
                className={cn(
                  'rounded-xl border px-3 py-2 text-center transition-colors hover:bg-white/5',
                  FRESHNESS_META[status].className,
                )}
              >
                <span className="block text-xl font-bold">{summary[status]}</span>
                <span className="text-[11px] uppercase tracking-wide">{FRESHNESS_META[status].label}</span>
              </Link>
            ))}
          </div>

          {urgent.length > 0 && (
            <ul className="space-y-1.5">
              {urgent.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/pantry?freshness=${item.freshness_status}`}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-white/5"
                  >
                    <span className="flex items-center gap-2 capitalize text-white/80">
                      <span className={cn('h-2 w-2 rounded-full', FRESHNESS_META[item.freshness_status].dot)} />
                      {item.name}
                    </span>
                    <span className="text-xs text-white/40">{formatExpiration(effectiveExpiration(item))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}
