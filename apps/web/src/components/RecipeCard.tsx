'use client';

import Image from 'next/image';
import { Check, Clock, Flame, Gauge, ShoppingBasket, Users } from 'lucide-react';
import type { Recipe } from '@/types';
import { formatMinutes, totalTime } from '@/lib/recipes';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

/** Vista dettaglio di una ricetta (usata in /recipes/[id] e nella pagina pubblica /recipe/[id]). */
export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const stats = [
    { icon: Clock, label: 'Total', value: formatMinutes(totalTime(recipe)) },
    { icon: Gauge, label: 'Difficulty', value: recipe.difficulty },
    { icon: Users, label: 'Servings', value: String(recipe.servings) },
    { icon: Flame, label: 'Calories', value: recipe.nutrition.calories ? `${recipe.nutrition.calories} kcal` : '—' },
  ];

  return (
    <Card className="overflow-hidden">
      {recipe.imageUrl && (
        <div className="relative aspect-[16/9] w-full bg-white/5">
          <Image src={recipe.imageUrl} alt={recipe.title} fill sizes="(max-width: 768px) 100vw, 768px" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent" />
        </div>
      )}

      <div className="space-y-8 p-5 sm:p-8">
        <div className="space-y-3">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{recipe.title}</h2>
          {recipe.description && <p className="text-white/60">{recipe.description}</p>}
          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recipe.tags.slice(0, 6).map((tag) => (
                <span key={tag} className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-white/60">#{tag}</span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-white/5 bg-black/30 p-3">
              <Icon className="mb-2 h-4 w-4 text-emerald-400" aria-hidden />
              <p className="text-[11px] uppercase tracking-wide text-white/40">{label}</p>
              <p className="text-sm font-semibold capitalize text-white">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-8 md:grid-cols-[1fr_1.4fr]">
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/50">
              <ShoppingBasket className="h-4 w-4" aria-hidden /> Ingredients
            </h3>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing, i) => (
                <li key={`${ing.name}-${i}`} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 capitalize text-white/85">
                    <span
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-full',
                        ing.available ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/30',
                      )}
                      title={ing.available ? 'In your pantry' : 'Missing'}
                    >
                      {ing.available && <Check className="h-3 w-3" aria-hidden />}
                    </span>
                    {ing.name}
                  </span>
                  <span className="text-xs text-white/40">
                    {ing.quantity ?? ''} {ing.unit ?? ''}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">Steps</h3>
            <ol className="space-y-4">
              {recipe.steps.map((s) => (
                <li key={s.step} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-300">
                    {s.step}
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm leading-relaxed text-white/80">{s.instruction}</p>
                    {s.duration ? <p className="text-xs text-white/40">⏱ {s.duration} min</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {(recipe.nutrition.protein > 0 || recipe.nutrition.carbs > 0 || recipe.nutrition.fat > 0) && (
          <div className="grid grid-cols-3 gap-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4 text-center">
            {[
              ['Protein', recipe.nutrition.protein],
              ['Carbs', recipe.nutrition.carbs],
              ['Fat', recipe.nutrition.fat],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-lg font-bold text-white">{value}g</p>
                <p className="text-[11px] uppercase tracking-wide text-white/40">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
