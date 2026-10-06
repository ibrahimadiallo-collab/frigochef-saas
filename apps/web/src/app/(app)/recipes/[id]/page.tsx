'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChefHat, Globe, Heart, Lock, Share2, Trash2 } from 'lucide-react';
import type { Recipe } from '@/types';
import { apiFetch, errorMessage } from '@/lib/http';
import { EVENTS, trackEvent } from '@/lib/analytics';
import RecipeCard from '@/components/RecipeCard';
import SocialShare from '@/components/SocialShare';
import { Button, buttonClasses } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';

export default function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'favorite' | 'public' | 'delete' | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<{ recipe: Recipe }>(`/api/recipes/${id}`);
      setRecipe(data.recipe);
      trackEvent(EVENTS.RECIPE_OPENED, { recipeId: id });
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(field: 'favorite' | 'public', body: Record<string, boolean>) {
    setBusy(field);
    setActionError(null);
    try {
      const data = await apiFetch<{ recipe: Recipe }>(`/api/recipes/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      setRecipe(data.recipe);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!window.confirm('Delete this recipe?')) return;
    setBusy('delete');
    try {
      await apiFetch(`/api/recipes/${id}`, { method: 'DELETE' });
      router.replace('/recipes');
    } catch (err) {
      setActionError(errorMessage(err));
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/recipes" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All recipes
      </Link>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !recipe ? (
        <div className="space-y-4"><Skeleton className="aspect-[16/9]" /><Skeleton className="h-40" /></div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Link href={`/recipes/${recipe.id}/cook`} className={buttonClasses('primary', 'md', 'flex-1 sm:flex-none')}>
              <ChefHat className="h-4 w-4" aria-hidden /> Cook This
            </Link>
            <Button variant="secondary" onClick={() => patch('favorite', { is_favorite: !recipe.isFavorite })} isLoading={busy === 'favorite'} aria-pressed={recipe.isFavorite}>
              <Heart className={cn('h-4 w-4', recipe.isFavorite && 'fill-red-500 text-red-500')} aria-hidden /> {recipe.isFavorite ? 'Saved' : 'Save'}
            </Button>
            <Button variant="secondary" onClick={() => patch('public', { is_public: !recipe.isPublic })} isLoading={busy === 'public'}>
              {recipe.isPublic ? <Globe className="h-4 w-4 text-emerald-400" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
              {recipe.isPublic ? 'Public' : 'Private'}
            </Button>
            <Button variant="secondary" onClick={() => setShareOpen(true)}><Share2 className="h-4 w-4" aria-hidden /> Share</Button>
            <Button variant="danger" onClick={remove} isLoading={busy === 'delete'} aria-label="Delete recipe"><Trash2 className="h-4 w-4" aria-hidden /></Button>
          </div>
          {actionError && <p role="alert" className="text-sm text-red-400">{actionError}</p>}
          <RecipeCard recipe={recipe} />
          <SocialShare recipe={recipe} isOpen={shareOpen} onClose={() => setShareOpen(false)} />
        </>
      )}
    </div>
  );
}
