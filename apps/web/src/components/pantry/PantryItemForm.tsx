'use client';

import { useState, type FormEvent } from 'react';
import { INGREDIENT_CATEGORIES, type IngredientCategory } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';

export interface PantryFormValues {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: IngredientCategory;
}

interface PantryItemFormProps {
  initial?: Partial<PantryFormValues>;
  submitLabel?: string;
  onSubmit: (values: PantryFormValues) => Promise<void>;
  onCancel?: () => void;
}

/** Form riutilizzabile per aggiungere/modificare un ingrediente (pantry e scan). */
export function PantryItemForm({ initial, submitLabel = 'Save', onSubmit, onCancel }: PantryItemFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [quantity, setQuantity] = useState(initial?.quantity != null ? String(initial.quantity) : '');
  const [unit, setUnit] = useState(initial?.unit ?? '');
  const [category, setCategory] = useState<IngredientCategory>(initial?.category ?? 'vegetable');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter an ingredient name.');
      return;
    }
    const qty = quantity.trim() === '' ? null : Number(quantity);
    if (qty !== null && (!Number.isFinite(qty) || qty < 0)) {
      setError('Quantity must be a positive number.');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await onSubmit({ name: name.trim(), quantity: qty, unit: unit.trim() || null, category });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="ingredient-name">Name</Label>
        <Input id="ingredient-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. tomatoes" autoFocus maxLength={80} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="ingredient-qty">Quantity</Label>
          <Input id="ingredient-qty" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="2" />
        </div>
        <div>
          <Label htmlFor="ingredient-unit">Unit</Label>
          <Input id="ingredient-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pcs, g, ml" maxLength={20} />
        </div>
      </div>
      <div>
        <Label htmlFor="ingredient-category">Category</Label>
        <Select id="ingredient-category" value={category} onChange={(e) => setCategory(e.target.value as IngredientCategory)}>
          {INGREDIENT_CATEGORIES.map((c) => (
            <option key={c} value={c} className="bg-gray-900 capitalize">
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </Select>
      </div>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
        )}
        <Button type="submit" className="flex-1" isLoading={isSaving}>{submitLabel}</Button>
      </div>
    </form>
  );
}
