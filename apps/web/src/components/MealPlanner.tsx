'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Coffee, Flame, Moon, Sun } from 'lucide-react';
import type { MealPlanDay } from '@/types';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

const MEALS = [
  { key: 'breakfast', label: 'Breakfast', icon: Coffee, color: 'text-amber-300' },
  { key: 'lunch', label: 'Lunch', icon: Sun, color: 'text-emerald-300' },
  { key: 'dinner', label: 'Dinner', icon: Moon, color: 'text-sky-300' },
] as const;

/** Piano settimanale: selettore del giorno + 3 pasti. */
export default function MealPlanner({ days }: { days: MealPlanDay[] }) {
  const [active, setActive] = useState(0);
  const day = days[active];
  if (!day) return null;
  const dayCalories = day.breakfast.calories + day.lunch.calories + day.dinner.calories;

  return (
    <Card className="overflow-hidden">
      <div className="flex gap-1 overflow-x-auto border-b border-white/5 p-2">
        {days.map((d, i) => (
          <button
            key={d.day}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              'relative min-w-[64px] flex-1 rounded-xl px-3 py-2 text-sm font-medium',
              active === i ? 'text-black' : 'text-white/50 hover:bg-white/5 hover:text-white',
            )}
          >
            {active === i && <motion.span layoutId="meal-day" className="absolute inset-0 rounded-xl bg-emerald-500" />}
            <span className="relative">{d.day.slice(0, 3)}</span>
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="text-lg font-semibold text-white">{day.day}</h3>
          <span className="text-xs text-white/40">{dayCalories} kcal total</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {MEALS.map(({ key, label, icon: Icon, color }) => {
            const meal = day[key];
            return (
              <motion.div
                key={`${day.day}-${key}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-white/5 bg-black/30 p-4"
              >
                <div className={cn('mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide', color)}>
                  <Icon className="h-4 w-4" aria-hidden /> {label}
                </div>
                <p className="font-medium text-white">{meal.name}</p>
                <div className="mt-3 flex gap-4 text-xs text-white/50">
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden />{meal.time}</span>
                  <span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5" aria-hidden />{meal.calories} kcal</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
