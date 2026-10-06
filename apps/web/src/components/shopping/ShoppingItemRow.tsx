'use client';

import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import type { ShoppingItem } from '@/types';
import { formatQuantity } from '@/lib/shopping';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';

export interface ShoppingItemPatch {
  name?: string;
  quantity?: number | null;
  unit?: string | null;
  checked?: boolean;
}

interface ShoppingItemRowProps {
  item: ShoppingItem;
  onUpdate: (id: string, patch: ShoppingItemPatch) => Promise<boolean>;
  onDelete: (id: string) => void;
}

export function ShoppingItemRow({ item, onUpdate, onDelete }: ShoppingItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity != null ? String(item.quantity) : '');
  const [unit, setUnit] = useState(item.unit ?? '');

  async function save(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const q = quantity.trim() === '' ? null : Number(quantity);
    const ok = await onUpdate(item.id, {
      name: trimmed,
      quantity: q != null && Number.isFinite(q) && q >= 0 ? q : null,
      unit: unit.trim() || null,
    });
    if (ok) setIsEditing(false);
  }

  if (isEditing) {
    return (
      <li className="rounded-xl border border-emerald-500/30 bg-white/[0.03] p-2">
        <form onSubmit={save} className="flex flex-wrap items-center gap-2">
          <Input aria-label="Item name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1 basis-40" autoFocus />
          <Input aria-label="Quantity" type="number" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-20" placeholder="Qty" />
          <Input aria-label="Unit" value={unit} maxLength={30} onChange={(e) => setUnit(e.target.value)} className="w-20" placeholder="Unit" />
          <button type="submit" className="rounded-lg p-2 text-emerald-400 hover:bg-emerald-500/10" aria-label="Save item"><Check className="h-4 w-4" /></button>
          <button type="button" onClick={() => setIsEditing(false)} className="rounded-lg p-2 text-white/50 hover:bg-white/5" aria-label="Cancel editing"><X className="h-4 w-4" /></button>
        </form>
      </li>
    );
  }

  const qty = formatQuantity(item);
  return (
    <motion.li layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -16 }} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.03]">
      <button
        type="button"
        role="checkbox"
        aria-checked={item.checked}
        aria-label={`Mark ${item.name} as ${item.checked ? 'not bought' : 'bought'}`}
        onClick={() => void onUpdate(item.id, { checked: !item.checked })}
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
          item.checked ? 'border-emerald-500 bg-emerald-500 text-black' : 'border-white/25 hover:border-emerald-400',
        )}
      >
        {item.checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </button>
      <div className={cn('min-w-0 flex-1', item.checked && 'opacity-40')}>
        <p className={cn('truncate text-sm text-white', item.checked && 'line-through')}>{item.name}</p>
        {qty && <p className="text-xs text-white/45">{qty}</p>}
      </div>
      <button type="button" onClick={() => setIsEditing(true)} className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white" aria-label={`Edit ${item.name}`}><Pencil className="h-4 w-4" /></button>
      <button type="button" onClick={() => onDelete(item.id)} className="rounded-lg p-2 text-white/40 hover:bg-red-500/10 hover:text-red-400" aria-label={`Delete ${item.name}`}><Trash2 className="h-4 w-4" /></button>
    </motion.li>
  );
}
