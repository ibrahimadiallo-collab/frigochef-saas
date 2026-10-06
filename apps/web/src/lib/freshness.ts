import type { FreshnessStatus, FreshnessSummary, IngredientCategory } from '@/types';

/** Shelf-life di default (giorni) per categoria, usato quando l'AI non fornisce una scadenza. */
export const DEFAULT_SHELF_LIFE_DAYS: Record<IngredientCategory, number> = {
  dairy: 5,
  meat: 3,
  fish: 2,
  vegetable: 7,
  fruit: 5,
  grain: 30,
  condiment: 180,
  beverage: 10,
  other: 7,
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function estimateExpiration(category: IngredientCategory, from: Date = new Date()): string {
  const days = DEFAULT_SHELF_LIFE_DAYS[category] ?? DEFAULT_SHELF_LIFE_DAYS.other;
  return new Date(from.getTime() + days * DAY_MS).toISOString();
}

/** Giorni (frazionari) mancanti alla scadenza; negativo se già scaduto. */
export function daysUntil(expiration: string, now: Date = new Date()): number {
  return (new Date(expiration).getTime() - now.getTime()) / DAY_MS;
}

/** < 2 giorni: critical · 2–5 giorni: soon · > 5 giorni: fresh. */
export function freshnessFromDays(days: number): FreshnessStatus {
  if (days < 2) return 'critical';
  if (days <= 5) return 'soon';
  return 'fresh';
}

interface FreshnessInput {
  estimated_expiration: string | null;
  category: IngredientCategory;
  added_at?: string | null;
}

/** Calcola sempre lo stato a runtime (lo stato salvato nel DB può essere obsoleto). */
export function computeFreshness(item: FreshnessInput, now: Date = new Date()): FreshnessStatus {
  const expiration =
    item.estimated_expiration ?? estimateExpiration(item.category, item.added_at ? new Date(item.added_at) : now);
  return freshnessFromDays(daysUntil(expiration, now));
}

export function effectiveExpiration(item: FreshnessInput): string {
  return item.estimated_expiration ?? estimateExpiration(item.category, item.added_at ? new Date(item.added_at) : new Date());
}

export function summarizeFreshness(items: FreshnessInput[], now: Date = new Date()): FreshnessSummary {
  const summary: FreshnessSummary = { critical: 0, soon: 0, fresh: 0, total: items.length };
  for (const item of items) summary[computeFreshness(item, now)] += 1;
  return summary;
}

export function formatExpiration(expiration: string, now: Date = new Date()): string {
  const days = daysUntil(expiration, now);
  if (days < 0) return 'Likely expired';
  if (days < 1) return 'Use today';
  const rounded = Math.round(days);
  return `in ~${rounded} day${rounded === 1 ? '' : 's'}`;
}
