'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Info, Pencil, Plus, Refrigerator, Search, Trash2, X, Camera } from 'lucide-react';
import {
  FRESHNESS_STATUSES,
  INGREDIENT_CATEGORIES,
  type FreshnessStatus,
  type IngredientCategory,
  type PantryItem,
} from '@/types';
import { apiFetch, errorMessage } from '@/lib/http';
import { effectiveExpiration, formatExpiration } from '@/lib/freshness';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton, Spinner } from '@/components/ui/Spinner';
import { FreshnessBadge } from '@/components/ui/FreshnessBadge';
import { PantryItemForm, type PantryFormValues } from '@/components/pantry/PantryItemForm';
import { cn } from '@/lib/cn';

type SortKey = 'expiration' | 'category' | 'recent';

function isFreshness(v: string | null): v is FreshnessStatus {
  return v !== null && (FRESHNESS_STATUSES as readonly string[]).includes(v);
}

function PantryRow({
  item,
  onSave,
  onDelete,
}: {
  item: PantryItem;
  onSave: (id: string, values: Partial<PantryFormValues>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity != null ? String(item.quantity) : '');
  const [unit, setUnit] = useState(item.unit ?? '');
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  async function save() {
    const qty = quantity.trim() === '' ? null : Number(quantity);
    if (!name.trim()) return setRowError('Name is required.');
    if (qty !== null && !Number.isFinite(qty)) return setRowError('Quantity must be a number.');
    setBusy(true);
    setRowError(null);
    try {
      await onSave(item.id, { name: name.trim(), quantity: qty, unit: unit.trim() || null });
      setEditing(false);
    } catch (err) {
      setRowError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await onDelete(item.id);
    } catch (err) {
      setRowError(errorMessage(err));
      setBusy(false);
    }
  }

  const expiration = effectiveExpiration(item);

  return (
    <motion.li layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 30, height: 0 }}>
      <Card className={cn('p-4', item.freshness_status === 'critical' && 'border-red-500/20')}>
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_80px_90px] gap-2">
              <Input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              <Input aria-label="Quantity" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Qty" />
              <Input aria-label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit" />
            </div>
            {rowError && <p className="text-xs text-red-400">{rowError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={busy}><X className="h-4 w-4" aria-hidden /> Cancel</Button>
              <Button size="sm" onClick={save} isLoading={busy}><Check className="h-4 w-4" aria-hidden /> Save</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-semibold capitalize text-white">{item.name}</h3>
                <FreshnessBadge status={item.freshness_status} />
              </div>
              <p className="text-xs text-white/50">
                <span className="capitalize">{item.category}</span>
                {item.quantity != null && <> · {item.quantity} {item.unit ?? ''}</>}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-white/60">
                Estimated expiration: {formatExpiration(expiration)}
                <span className="inline-flex items-center gap-0.5 rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/40" title="Estimated from the ingredient category. Always check the label and your senses.">
                  <Info className="h-3 w-3" aria-hidden /> AI estimate
                </span>
              </p>
              {rowError && <p className="text-xs text-red-400">{rowError}</p>}
            </div>
            <div className="flex shrink-0 gap-1">
              <button type="button" onClick={() => setEditing(true)} aria-label={`Edit ${item.name}`} className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white">
                <Pencil className="h-4 w-4" />
              </button>
              <button type="button" onClick={remove} disabled={busy} aria-label={`Delete ${item.name}`} className="rounded-lg p-2 text-white/40 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </motion.li>
  );
}

function PantryView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFreshness = searchParams.get('freshness');

  const [items, setItems] = useState<PantryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState<IngredientCategory | 'all'>('all');
  const [freshness, setFreshness] = useState<FreshnessStatus | 'all'>(isFreshness(initialFreshness) ? initialFreshness : 'all');
  const [sort, setSort] = useState<SortKey>('expiration');
  const [addOpen, setAddOpen] = useState(searchParams.get('add') === '1');

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const query = useMemo(() => {
    const p = new URLSearchParams({ sort });
    if (category !== 'all') p.set('category', category);
    if (freshness !== 'all') p.set('freshness', freshness);
    if (debounced) p.set('search', debounced);
    return p.toString();
  }, [sort, category, freshness, debounced]);

  const load = useCallback(async () => {
    setError(null);
    setIsRefreshing(true);
    try {
      const data = await apiFetch<{ items: PantryItem[] }>(`/api/pantry?${query}`);
      setItems(data.items);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsRefreshing(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  async function addItem(values: PantryFormValues) {
    await apiFetch('/api/pantry', { method: 'POST', body: JSON.stringify(values) });
    setAddOpen(false);
    if (searchParams.get('add')) router.replace('/pantry');
    await load();
  }

  async function saveItem(id: string, values: Partial<PantryFormValues>) {
    const { item } = await apiFetch<{ item: PantryItem }>(`/api/pantry/${id}`, { method: 'PUT', body: JSON.stringify(values) });
    setItems((list) => list?.map((i) => (i.id === id ? item : i)) ?? null);
  }

  async function deleteItem(id: string) {
    await apiFetch(`/api/pantry/${id}`, { method: 'DELETE' });
    setItems((list) => list?.filter((i) => i.id !== id) ?? null);
  }

  const hasFilters = category !== 'all' || freshness !== 'all' || debounced !== '';

  return (
    <div className="relative">
      <PageHeader
        title="Pantry"
        subtitle={items ? `${items.length} ingredient${items.length === 1 ? '' : 's'}${hasFilters ? ' match your filters' : ' tracked'}` : 'Everything in your kitchen'}
        action={<Button onClick={() => setAddOpen(true)} className="hidden sm:inline-flex"><Plus className="h-4 w-4" aria-hidden /> Add ingredient</Button>}
      />

      <div className="mb-5 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" aria-hidden />
          <Input aria-label="Search ingredients" placeholder="Search ingredients" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="grid grid-cols-3 gap-2 sm:contents">
          <Select aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value as IngredientCategory | 'all')}>
            <option value="all" className="bg-gray-900">All categories</option>
            {INGREDIENT_CATEGORIES.map((c) => <option key={c} value={c} className="bg-gray-900">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </Select>
          <Select aria-label="Filter by freshness" value={freshness} onChange={(e) => setFreshness(e.target.value as FreshnessStatus | 'all')}>
            <option value="all" className="bg-gray-900">All freshness</option>
            <option value="critical" className="bg-gray-900">🔴 Critical</option>
            <option value="soon" className="bg-gray-900">🟡 Soon</option>
            <option value="fresh" className="bg-gray-900">🟢 Fresh</option>
          </Select>
          <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="expiration" className="bg-gray-900">Expiring first</option>
            <option value="category" className="bg-gray-900">Category</option>
            <option value="recent" className="bg-gray-900">Recently added</option>
          </Select>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items === null ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : items.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={Search}
            title="No ingredients match these filters"
            action={<Button variant="secondary" size="sm" onClick={() => { setSearch(''); setCategory('all'); setFreshness('all'); }}>Clear filters</Button>}
          />
        ) : (
          <EmptyState
            icon={Refrigerator}
            title="Your pantry is empty. Scan your fridge to get started."
            description="Or add ingredients manually with the + button."
            action={<Link href="/scan" className={buttonClasses('primary')}><Camera className="h-4 w-4" aria-hidden /> Scan My Fridge</Link>}
          />
        )
      ) : (
        <>
          {isRefreshing && <Spinner className="mb-3 justify-start" label="Updating…" />}
          <ul className="grid gap-2 md:grid-cols-2">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <PantryRow key={`${item.id}-${item.name}-${item.quantity}`} item={item} onSave={saveItem} onDelete={deleteItem} />
              ))}
            </AnimatePresence>
          </ul>
        </>
      )}

      <motion.button
        type="button"
        onClick={() => setAddOpen(true)}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-24 right-5 z-20 flex h-14 items-center gap-2 rounded-full bg-emerald-500 px-5 font-semibold text-black shadow-xl shadow-emerald-500/30 lg:bottom-8 lg:right-8"
      >
        <Plus className="h-5 w-5" aria-hidden /> Add ingredient
      </motion.button>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add ingredient">
        <PantryItemForm submitLabel="Add to pantry" onSubmit={addItem} onCancel={() => setAddOpen(false)} />
      </Modal>
    </div>
  );
}

export default function PantryPage() {
  return (
    <Suspense fallback={<Spinner className="py-20" label="Loading pantry…" />}>
      <PantryView />
    </Suspense>
  );
}
