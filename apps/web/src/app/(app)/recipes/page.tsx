'use client';

import { Suspense, useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ChefHat, Sparkles, UtensilsCrossed } from 'lucide-react';
import type { MealType, Recipe } from '@/types';
import { apiFetch, errorMessage } from '@/lib/http';
import { EVENTS, trackEvent } from '@/lib/analytics';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton, Spinner } from '@/components/ui/Spinner';
import { RecipeGridCard } from '@/components/recipes/RecipeGridCard';

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'any', label: 'Any meal' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

interface GenerateOptions {
  preferences: string;
  mealType: MealType;
  servings: number;
}

function RecipesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(Boolean(searchParams.get('generate')));
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [options, setOptions] = useState<GenerateOptions>(() => {
    // Dal meal plan arriva ?generate=<titolo del piatto>: lo usiamo come preferenza iniziale.
    const fromPlan = searchParams.get('generate');
    return { preferences: fromPlan && fromPlan !== '1' ? `Recipe for: ${fromPlan.slice(0, 280)}` : '', mealType: 'dinner', servings: 2 };
  });

  const load = useCallback(async () => {
    setError(null);
    setRecipes(null);
    try {
      const data = await apiFetch<{ recipes: Recipe[] }>('/api/recipes');
      setRecipes(data.recipes);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function generate(e?: FormEvent) {
    e?.preventDefault();
    setDialogOpen(false);
    setGenerateError(null);
    setIsGenerating(true);
    if (searchParams.get('generate')) router.replace('/recipes');
    try {
      const { recipe } = await apiFetch<{ recipe: Recipe }>('/api/recipes/generate', {
        method: 'POST',
        body: JSON.stringify({
          preferences: options.preferences.trim() || undefined,
          mealType: options.mealType,
          servings: options.servings,
        }),
      });
      setRecipes((list) => [recipe, ...(list ?? [])]);
      trackEvent(EVENTS.RECIPE_GENERATED, { recipeId: recipe.id, mealType: options.mealType, source: 'recipes' });
    } catch (err) {
      setGenerateError(errorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Recipes"
        subtitle="AI recipes built around what's already in your pantry."
        action={
          <Button size="lg" onClick={() => setDialogOpen(true)} isLoading={isGenerating}>
            {!isGenerating && <Sparkles className="h-5 w-5" aria-hidden />} Generate New Recipe
          </Button>
        }
      />

      <AnimatePresence>
        {isGenerating && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
            <Card className="flex items-center gap-4 border-emerald-500/20 p-5">
              <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 1.2 }}>
                <ChefHat className="h-8 w-8 text-emerald-400" aria-hidden />
              </motion.div>
              <div>
                <p className="font-medium text-white">Cooking up a recipe…</p>
                <p className="text-sm text-white/50">Prioritizing ingredients that expire soon.</p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {generateError && (
        <div className="mb-6">
          <ErrorState message={generateError} onRetry={() => generate()} />
        </div>
      )}

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : recipes === null ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="aspect-[3/4]" />)}
        </div>
      ) : recipes.length === 0 && !isGenerating ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="No recipes yet"
          description="Generate your first recipe. If your pantry is empty we'll use common kitchen staples."
          action={<Button onClick={() => setDialogOpen(true)}><Sparkles className="h-4 w-4" aria-hidden /> Generate New Recipe</Button>}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {recipes.map((recipe, i) => <RecipeGridCard key={recipe.id} recipe={recipe} index={i} />)}
        </div>
      )}

      <Modal open={dialogOpen} onClose={() => setDialogOpen(false)} title="Generate a recipe">
        <form onSubmit={generate} className="space-y-4">
          <div>
            <Label htmlFor="pref">Preferences (optional)</Label>
            <Input id="pref" maxLength={300} placeholder="e.g. vegetarian, quick, spicy" value={options.preferences} onChange={(e) => setOptions((o) => ({ ...o, preferences: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="meal">Meal</Label>
              <Select id="meal" value={options.mealType} onChange={(e) => setOptions((o) => ({ ...o, mealType: e.target.value as MealType }))}>
                {MEAL_TYPES.map((m) => <option key={m.value} value={m.value} className="bg-gray-900">{m.label}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="servings">Servings</Label>
              <Select id="servings" value={options.servings} onChange={(e) => setOptions((o) => ({ ...o, servings: Number(e.target.value) }))}>
                {[1, 2, 3, 4, 5, 6, 8].map((n) => <option key={n} value={n} className="bg-gray-900">{n}</option>)}
              </Select>
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full"><Sparkles className="h-5 w-5" aria-hidden /> Generate</Button>
        </form>
      </Modal>
    </div>
  );
}

export default function RecipesPage() {
  return (
    <Suspense fallback={<Spinner className="py-20" label="Loading recipes…" />}>
      <RecipesView />
    </Suspense>
  );
}
