import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <div role="status" className={cn('flex items-center justify-center gap-3 text-white/60', className)}>
      <Loader2 className="h-5 w-5 animate-spin text-emerald-400" aria-hidden />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-white/5', className)} />;
}
