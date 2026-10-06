'use client';

import { ShoppingCart } from 'lucide-react';
import type { PlanShoppingItem } from '@/types';
import { CATEGORY_META } from '@/lib/shopping';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface PlanShoppingListProps {
  items: PlanShoppingItem[];
  onAdd: () => void;
  isAdding: boolean;
}

/** Ingredienti mancanti del piano, con invio alla shopping list. */
export function PlanShoppingList({ items, onAdd, isAdding }: PlanShoppingListProps) {
  if (items.length === 0) return null;
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-white">
            <ShoppingCart className="h-4 w-4 text-emerald-400" aria-hidden /> Shopping list needed
          </h2>
          <p className="mt-1 text-sm text-white/50">{items.length} ingredients missing from your pantry for this week.</p>
        </div>
        <Button onClick={onAdd} isLoading={isAdding}>Add to Shopping List</Button>
      </div>
      <ul className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.name} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/75">
            <span aria-hidden>{CATEGORY_META[item.category].emoji}</span> {item.name}
            {item.quantity != null && <span className="text-white/40"> · {item.quantity}{item.unit ? ` ${item.unit}` : ''}</span>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
