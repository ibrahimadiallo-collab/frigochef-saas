'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { PartyPopper } from 'lucide-react';
import type { Recipe } from '@/types';
import { apiFetch, errorMessage } from '@/lib/http';
import CookMode from '@/components/CookMode';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Spinner } from '@/components/ui/Spinner';

export default function CookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<{ recipe: Recipe }>(`/api/recipes/${id}`);
      setRecipe(data.recipe);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!recipe) return <Spinner className="py-24" label="Preparing cook mode…" />;
  if (recipe.steps.length === 0) return <ErrorState message="This recipe has no steps to follow." />;

  return (
    <AnimatePresence mode="wait">
      {finished ? (
        <motion.div
          key="done"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#0a0a0a] px-6 text-center"
        >
          <motion.div initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring' }}>
            <PartyPopper className="h-16 w-16 text-emerald-400" aria-hidden />
          </motion.div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">Bon appétit!</h1>
            <p className="text-white/60">You cooked {recipe.title}. Enjoy your meal.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={() => router.push('/recipes')}>Back to recipes</Button>
            <Button size="lg" variant="secondary" onClick={() => router.push('/pantry')}>Update pantry</Button>
          </div>
        </motion.div>
      ) : (
        <motion.div key="cook" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <CookMode recipe={recipe} onExit={() => router.push(`/recipes/${recipe.id}`)} onDone={() => setFinished(true)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
