'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, Camera, ChefHat, Clock, Plus, Sparkles, UtensilsCrossed } from 'lucide-react';
import type { PantryItem, Recipe } from '@/types';
import { apiFetch, errorMessage } from '@/lib/http';
import { formatMinutes, totalTime } from '@/lib/recipes';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { FreshnessRadar } from '@/components/freshness/FreshnessRadar';
import { Card } from '@/components/ui/Card';
import { buttonClasses } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Spinner';

function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const QUICK_ACTIONS = [
  { href: '/scan', label: 'Scan fridge', icon: Camera },
  { href: '/pantry?add=1', label: 'Add ingredient', icon: Plus },
  { href: '/recipes?generate=1', label: 'Generate recipe', icon: Sparkles },
  { href: '/meal-plan', label: 'Meal plan', icon: CalendarDays },
];

export default function DashboardPage() {
  const { displayName, isLoading: userLoading } = useCurrentUser();
  const [items, setItems] = useState<PantryItem[] | null>(null);
  const [latest, setLatest] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hello, setHello] = useState('Welcome back');

  const load = useCallback(async () => {
    setError(null);
    setItems(null);
    try {
      const [pantry, recipes] = await Promise.all([
        apiFetch<{ items: PantryItem[] }>('/api/pantry'),
        apiFetch<{ recipes: Recipe[] }>('/api/recipes?limit=1'),
      ]);
      setItems(pantry.items);
      setLatest(recipes.recipes[0] ?? null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    setHello(greeting()); // calcolato sul client per usare l'ora locale
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-white/50">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {hello}, {userLoading ? '…' : <span className="capitalize">{displayName}</span>}
        </h1>
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/15 via-gray-900/60 to-gray-900/60 p-6 sm:p-8">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-white sm:text-2xl">What&apos;s in your fridge?</h2>
              <p className="text-sm text-white/60">Snap a photo and FrigoChef will list every ingredient in seconds.</p>
            </div>
            <Link href="/scan" className={buttonClasses('primary', 'lg', 'shrink-0')}>
              <Camera className="h-5 w-5" aria-hidden /> Scan Fridge
            </Link>
          </div>
        </Card>
      </motion.div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          {items === null ? <Skeleton className="h-72" /> : <FreshnessRadar items={items} />}

          <Card className="flex flex-col p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
              <UtensilsCrossed className="h-4 w-4 text-emerald-400" aria-hidden /> Tonight&apos;s dinner idea
            </div>
            {items === null ? (
              <Skeleton className="h-48" />
            ) : latest ? (
              <Link href={`/recipes/${latest.id}`} className="group flex flex-1 flex-col gap-3">
                <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-white/5">
                  {latest.imageUrl && (
                    <Image src={latest.imageUrl} alt={latest.title} fill sizes="(max-width: 1024px) 100vw, 400px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-white group-hover:text-emerald-300">{latest.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-white/50">
                    <Clock className="h-3.5 w-3.5" aria-hidden /> {formatMinutes(totalTime(latest))} · <span className="capitalize">{latest.difficulty}</span>
                  </p>
                </div>
                <span className={buttonClasses('secondary', 'sm', 'mt-auto w-full')}>
                  <ChefHat className="h-4 w-4" aria-hidden /> View recipe
                </span>
              </Link>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm text-white/50">No recipes yet. Let the AI suggest something with what you have.</p>
                <Link href="/recipes?generate=1" className={buttonClasses('primary', 'sm')}>
                  <Sparkles className="h-4 w-4" aria-hidden /> Generate recipe
                </Link>
              </div>
            )}
          </Card>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/40">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_ACTIONS.map(({ href, label, icon: Icon }, i) => (
            <motion.div key={href} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
              <Link
                href={href}
                className="group flex h-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-gray-900/60 p-4 text-sm font-medium text-white/80 hover:border-emerald-500/30 hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-emerald-400" aria-hidden /> {label}
                </span>
                <ArrowRight className="h-4 w-4 text-white/30 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
