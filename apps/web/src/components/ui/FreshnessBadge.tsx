import type { FreshnessStatus } from '@/types';
import { cn } from '@/lib/cn';

export const FRESHNESS_META: Record<FreshnessStatus, { label: string; emoji: string; className: string; dot: string }> = {
  critical: { label: 'Critical', emoji: '🔴', className: 'bg-red-500/10 text-red-300 border-red-500/20', dot: 'bg-red-500' },
  soon: { label: 'Soon', emoji: '🟡', className: 'bg-amber-500/10 text-amber-300 border-amber-500/20', dot: 'bg-amber-400' },
  fresh: { label: 'Fresh', emoji: '🟢', className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', dot: 'bg-emerald-500' },
};

export function FreshnessBadge({ status, className }: { status: FreshnessStatus; className?: string }) {
  const meta = FRESHNESS_META[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', meta.className, className)}>
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}
