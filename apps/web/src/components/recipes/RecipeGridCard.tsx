'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChefHat, Clock, Gauge } from 'lucide-react';
import type { Recipe } from '@/types';
import { formatMinutes, totalTime } from '@/lib/recipes';
import { buttonClasses } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export function RecipeGridCard({ recipe, index = 0 }: { recipe: Recipe; index?: number }) {
  const available = recipe.ingredients.filter((i) => i.available).length;
  const total = recipe.ingredients.length;
  const ratio = total ? available / total : 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.05 }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gray-900/60 backdrop-blur-xl hover:border-emerald-500/30"
    >
      <Link href={`/recipes/${recipe.id}`} className="relative block aspect-[4/3] overflow-hidden bg-white/5">
        {recipe.imageUrl && (
          <Image
            src={recipe.imageUrl}
            alt={recipe.title}
            fill
            sizes="(max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <span
          className={cn(
            'absolute left-2 top-2 rounded-full border px-2 py-0.5 text-[11px] font-semibold backdrop-blur-md',
            ratio >= 0.75
              ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-200'
              : ratio >= 0.4
                ? 'border-amber-500/30 bg-amber-500/20 text-amber-200'
                : 'border-white/20 bg-black/50 text-white/80',
          )}
        >
          {available}/{total} ingredients available
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
        <Link href={`/recipes/${recipe.id}`}>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white sm:text-base">{recipe.title}</h3>
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden />{formatMinutes(totalTime(recipe))}</span>
          <span className="inline-flex items-center gap-1 capitalize"><Gauge className="h-3.5 w-3.5" aria-hidden />{recipe.difficulty}</span>
        </div>
        <Link href={`/recipes/${recipe.id}/cook`} className={buttonClasses('primary', 'sm', 'mt-auto w-full')}>
          <ChefHat className="h-4 w-4" aria-hidden /> Cook This
        </Link>
      </div>
    </motion.article>
  );
}
