'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Leaf, Sparkles } from 'lucide-react';
import type { MealPlan } from '@/types';
import { apiFetch, errorMessage } from '@/lib/http';
import { addDays, formatWeekRange, mondayOf, DAY_LABELS } from '@/lib/week';
import { EVENTS, trackEvent } from '@/lib/analytics';
import { FREE_LIMITS } from '@/lib/pricing';
import { useUser } from '@/hooks/useCurrentUser';
import MealPlanner, { type SelectedMeal } from '@/components/MealPlanner';
import { PlanShoppingList } from '@/components/meal-plan/PlanShoppingList';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button, buttonClasses } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { ProGate } from '@/components/ui/ProGate';
import { Spinner, Skeleton } from '@/components/ui/Spinner';
import { Input, Label } from '@/components/ui/Input';
import { useToast } from '@/components/ui/ToastProvider';

export default function MealPlanPage() {
  const toast = useToast();
  const { isPro, usage, refresh: refreshUser } = useUser();
  const [weekStart, setWeekStart] = useState(() => mondayOf());
  const [plan, setPlan] = useState<MealPlan | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAddingList, setIsAddingList] = useState(false);
  const [selected, setSelected] = useState<SelectedMeal | null>(null);
  const [preferences, setPreferences] = useState('');
  const [servings, setServings] = useState(2);

  const generationLocked = !isPro && usage.mealPlanCount >= FREE_LIMITS.mealPlans;

  const load = useCallback(async (week: string) => {
    setLoadError(null);
    setPlan(undefined);
    try {
      const data = await apiFetch<{ plan: MealPlan | null }>(`/api/meal-plan?weekStart=${week}`);
      setPlan(data.plan);
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void load(weekStart);
  }, [load, weekStart]);

  async function generate() {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const data = await apiFetch<{ plan: MealPlan }>('/api/meal-plan', {
        method: 'POST',
        body: JSON.stringify({ weekStart, preferences: preferences.trim() || undefined, servings }),
      });
      setPlan(data.plan);
      trackEvent(EVENTS.MEAL_PLAN_CREATED, { weekStart, servings, shoppingItems: data.plan.plan.shoppingList.length });
      toast.success('Your AI meal plan is ready.');
      void refreshUser();
    } catch (err) {
      setGenerateError(errorMessage(err));
      toast.error(errorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  }

  async function addShoppingList() {
    if (!plan) return;
    setIsAddingList(true);
    try {
      const { added, skipped } = await apiFetch<{ added: number; skipped: number }>('/api/shopping-list/bulk', {
        method: 'PATCH',
        body: JSON.stringify({ items: plan.plan.shoppingList }),
      });
      trackEvent(EVENTS.SHOPPING_LIST_CREATED, { source: 'meal_plan', added });
      toast.success(
        added > 0
          ? `${added} item${added === 1 ? '' : 's'} added to your shopping list${skipped ? ` (${skipped} already there)` : ''}.`
          : 'Everything is already on your shopping list.',
      );
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsAddingList(false);
    }
  }

  const generatorForm = (
    <div className="grid gap-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
      <div>
        <Label htmlFor="prefs">Preferences (optional)</Label>
        <Input id="prefs" value={preferences} maxLength={300} placeholder="e.g. vegetarian, quick dinners" onChange={(e) => setPreferences(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="servings">Servings</Label>
        <Input id="servings" type="number" min={1} max={12} value={servings} onChange={(e) => setServings(Math.min(12, Math.max(1, Number(e.target.value) || 1)))} />
      </div>
      <Button onClick={generate} isLoading={isGenerating}>
        {!isGenerating && <Sparkles className="h-4 w-4" aria-hidden />} Generate with AI
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meal Plan"
        subtitle="A low-waste week, planned from your pantry."
        action={
          plan && !generationLocked ? (
            <Button onClick={generate} isLoading={isGenerating} variant="secondary">
              {!isGenerating && <Sparkles className="h-4 w-4" aria-hidden />} Regenerate
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-center justify-between gap-2 rounded-2xl border border-emerald-500/15 bg-[#111827]/70 p-2">
        <Button variant="ghost" size="sm" onClick={() => setWeekStart((w) => addDays(w, -7))} aria-label="Previous week">
          <ChevronLeft className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Previous week</span>
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold text-white">{formatWeekRange(weekStart)}</p>
          {weekStart === mondayOf() ? (
            <p className="text-xs text-emerald-400">This week</p>
          ) : (
            <button type="button" onClick={() => setWeekStart(mondayOf())} className="text-xs text-white/50 hover:text-emerald-400">Back to this week</button>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setWeekStart((w) => addDays(w, 7))} aria-label="Next week">
          <span className="hidden sm:inline">Next week</span> <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      {loadError ? (
        <ErrorState message={loadError} onRetry={() => load(weekStart)} />
      ) : isGenerating ? (
        <div className="space-y-4">
          <Spinner className="py-6" label="Planning your week with AI… this can take up to a minute." />
          <div className="grid gap-3 lg:grid-cols-7">
            {Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-28 lg:h-80" />)}
          </div>
        </div>
      ) : plan === undefined ? (
        <div className="grid gap-3 lg:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-16 lg:h-80" />)}
        </div>
      ) : plan === null ? (
        <div className="space-y-4">
          {generateError && <ErrorState message={generateError} onRetry={generate} />}
          <ProGate
            feature="unlimited AI meal plans"
            locked={generationLocked}
            freeNote={`The Free plan includes ${FREE_LIMITS.mealPlans} AI meal plan. You've already used it.`}
          >
            <EmptyState
              icon={CalendarDays}
              title="No meal plan yet"
              description="Generate your first AI meal plan. It uses the ingredients you already have, starting with what expires soon."
              action={<div className="w-full max-w-2xl text-left">{generatorForm}</div>}
            />
          </ProGate>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {(plan.plan.usedPantryItems.length > 0 || plan.plan.estimatedWasteReduction != null) && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-white/60">
              <Leaf className="h-4 w-4 text-emerald-400" aria-hidden />
              {plan.plan.usedPantryItems.length > 0 && <span>Uses {plan.plan.usedPantryItems.length} pantry items</span>}
              {plan.plan.estimatedWasteReduction != null && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-300">~{Math.round(plan.plan.estimatedWasteReduction)}% less waste</span>
              )}
            </div>
          )}
          <MealPlanner plan={plan.plan} onSelectMeal={setSelected} />
          <PlanShoppingList items={plan.plan.shoppingList} onAdd={addShoppingList} isAdding={isAddingList} />
        </motion.div>
      )}

      <Modal open={selected !== null} onClose={() => setSelected(null)} title={selected?.meal.title ?? ''}>
        {selected && (
          <div className="space-y-4">
            <p className="text-sm capitalize text-white/50">
              {DAY_LABELS[selected.day]} · {selected.slot}
            </p>
            <p className="flex items-center gap-2 text-sm text-white/70"><Clock className="h-4 w-4 text-emerald-400" aria-hidden /> {selected.meal.prepTime} min prep</p>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-white">Main ingredients</h3>
              <ul className="flex flex-wrap gap-2">
                {selected.meal.ingredients.map((ing) => (
                  <li key={ing} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/75">{ing}</li>
                ))}
              </ul>
            </div>
            <Link href={`/recipes?generate=${encodeURIComponent(selected.meal.title)}`} className={buttonClasses('primary', 'md', 'w-full')}>
              <Sparkles className="h-4 w-4" aria-hidden /> Get the full recipe
            </Link>
          </div>
        )}
      </Modal>
    </div>
  );
}
