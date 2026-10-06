import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** Superficie glass controllata (#111827 traslucido + bordo sottile). */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-white/10 bg-gray-900/60 backdrop-blur-xl shadow-xl shadow-black/20', className)}
      {...props}
    />
  );
}
