'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import { CalendarDays, Plus, Share2, ShoppingCart, Trash2 } from 'lucide-react';
import { SHOPPING_CATEGORIES, type ShoppingCategory, type ShoppingItem } from '@/types';
import { apiFetch, errorMessage } from '@/lib/http';
import { CATEGORY_META, shoppingCategoryOf, shoppingListToText, sortByCategory } from '@/lib/shopping';
import { EVENTS, trackEvent } from '@/lib/analytics';
import { ShoppingItemRow, type ShoppingItemPatch } from '@/components/shopping/ShoppingItemRow';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button, buttonClasses } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Spinner';
import { Input, Label, Select } from '@/components/ui/Input';
import { useToast } from '@/components/ui/ToastProvider';

const EMPTY_FORM = { name: '', quantity: '', unit: '', category: 'other' as ShoppingCategory };

export default function ShoppingListPage() {
  const toast = useToast();
  const [items, setItems] = useState<ShoppingItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setItems(null);
    try {
      const data = await apiFetch<{ items: ShoppingItem[] }>('/api/shopping-list');
      setItems(data.items);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(
    () =>
      SHOPPING_CATEGORIES.map((cat) => ({ cat, list: (items ?? []).filter((i) => shoppingCategoryOf(i.category) === cat) })).filter(
        (g) => g.list.length > 0,
      ),
    [items],
  );
  const remaining = (items ?? []).filter((i) => !i.checked).length;
  const completed = (items ?? []).length - remaining;

  async function addItem(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setIsSaving(true);
    try {
      const q = form.quantity.trim() === '' ? undefined : Number(form.quantity);
      const { item } = await apiFetch<{ item: ShoppingItem }>('/api/shopping-list', {
        method: 'POST',
        body: JSON.stringify({ name: form.name.trim(), quantity: q, unit: form.unit.trim() || undefined, category: form.category }),
      });
      if ((items ?? []).length === 0) trackEvent(EVENTS.SHOPPING_LIST_CREATED, { source: 'manual' });
      setItems((list) => sortByCategory([...(list ?? []), item]));
      setForm(EMPTY_FORM);
      setAddOpen(false);
      toast.success(`${item.name} added.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function updateItem(id: string, patch: ShoppingItemPatch): Promise<boolean> {
    const previous = items;
    // Aggiornamento ottimistico, ripristinato in caso di errore.
    setItems((list) => (list ?? []).map((i) => (i.id === id ? { ...i, ...patch } : i)));
    try {
      const { item } = await apiFetch<{ item: ShoppingItem }>(`/api/shopping-list/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
      setItems((list) => sortByCategory((list ?? []).map((i) => (i.id === id ? item : i))));
      return true;
    } catch (err) {
      setItems(previous);
      toast.error(errorMessage(err));
      return false;
    }
  }

  async function deleteItem(id: string) {
    const previous = items;
    setItems((list) => (list ?? []).filter((i) => i.id !== id));
    try {
      await apiFetch(`/api/shopping-list/${id}`, { method: 'DELETE' });
    } catch (err) {
      setItems(previous);
      toast.error(errorMessage(err));
    }
  }

  async function clearCompleted() {
    setIsClearing(true);
    try {
      const { deleted } = await apiFetch<{ deleted: number }>('/api/shopping-list?checked=true', { method: 'DELETE' });
      setItems((list) => (list ?? []).filter((i) => !i.checked));
      toast.success(`${deleted} completed item${deleted === 1 ? '' : 's'} cleared.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsClearing(false);
    }
  }

  async function share() {
    const text = shoppingListToText(items ?? []);
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Shopping list copied to clipboard.');
    } catch {
      toast.error('Could not access the clipboard on this device.');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Shopping List"
        subtitle="Everything you need for the week, in one place."
        action={
          <div className="flex gap-2">
            {completed > 0 && (
              <Button variant="ghost" onClick={clearCompleted} isLoading={isClearing}>
                {!isClearing && <Trash2 className="h-4 w-4" aria-hidden />} <span className="hidden sm:inline">Clear completed</span>
              </Button>
            )}
            <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" aria-hidden /> Add item</Button>
          </div>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items === null ? (
        <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Your shopping list is empty"
          description="Generate a meal plan or add items manually."
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/meal-plan" className={buttonClasses('secondary')}><CalendarDays className="h-4 w-4" aria-hidden /> Plan my week</Link>
              <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" aria-hidden /> Add item</Button>
            </div>
          }
        />
      ) : (
        <>
          {groups.map(({ cat, list }) => (
            <Card key={cat} className="p-3 sm:p-4">
              <h2 className="mb-1 flex items-center justify-between px-2 text-sm font-semibold text-white">
                <span><span aria-hidden>{CATEGORY_META[cat].emoji}</span> {CATEGORY_META[cat].label}</span>
                <span className="text-xs font-normal text-white/40">{list.filter((i) => !i.checked).length}/{list.length}</span>
              </h2>
              <ul>
                <AnimatePresence initial={false}>
                  {list.map((item) => (
                    <ShoppingItemRow key={`${item.id}-${item.name}-${item.quantity}-${item.unit}`} item={item} onUpdate={updateItem} onDelete={deleteItem} />
                  ))}
                </AnimatePresence>
              </ul>
            </Card>
          ))}
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#111827]/70 px-4 py-3">
            <p className="text-sm text-white/70">
              <span className="font-semibold text-white">{remaining}</span> item{remaining === 1 ? '' : 's'} remaining
            </p>
            <Button variant="secondary" size="sm" onClick={share}><Share2 className="h-4 w-4" aria-hidden /> Share list</Button>
          </div>
        </>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add item">
        <form onSubmit={addItem} className="space-y-4">
          <div>
            <Label htmlFor="item-name">Name</Label>
            <Input id="item-name" required maxLength={100} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Tomatoes" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="item-qty">Quantity</Label>
              <Input id="item-qty" type="number" min={0} step="any" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="item-unit">Unit</Label>
              <Input id="item-unit" maxLength={30} value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="kg, pcs…" />
            </div>
          </div>
          <div>
            <Label htmlFor="item-cat">Category</Label>
            <Select id="item-cat" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ShoppingCategory }))}>
              {SHOPPING_CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_META[c].emoji} {CATEGORY_META[c].label}</option>
              ))}
            </Select>
          </div>
          <Button type="submit" className="w-full" isLoading={isSaving}>Add to list</Button>
        </form>
      </Modal>
    </div>
  );
}
