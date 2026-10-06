'use client';

import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastData {
  id: number;
  type: ToastType;
  message: string;
}

const STYLES: Record<ToastType, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: 'border-emerald-500/40 text-emerald-300' },
  error: { icon: AlertCircle, className: 'border-red-500/40 text-red-300' },
  info: { icon: Info, className: 'border-white/15 text-white/80' },
};

export function Toast({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: number) => void }) {
  const { icon: Icon, className } = STYLES[toast.type];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 rounded-2xl border bg-[#111827]/95 px-4 py-3 text-sm shadow-2xl shadow-black/40 backdrop-blur-xl',
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="flex-1 text-white/90">{toast.message}</p>
      <button type="button" onClick={() => onDismiss(toast.id)} className="text-white/40 hover:text-white" aria-label="Dismiss notification">
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
