'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Clock, Coffee, Moon, Sun, type LucideIcon } from 'lucide-react';
import { MEAL_SLOTS, WEEK_DAYS, type MealPlanContent, type MealSlotKey, type PlannedMeal, type WeekDay } from '@/types';
import { DAY_LABELS, dayDate, mondayOf, toIsoDate } from '@/lib/week';
import { cn } from '@/lib/cn';

const SLOT_META: Record<MealSlotKey, { label: string; icon: LucideIcon }> = {
  breakfast: { label: 'Breakfast', icon: Coffee },
  lunch: { label: 'Lunch', icon: Sun },
  dinner: { label: 'Dinner', icon: Moon },
};

export interface SelectedMeal {
  day: WeekDay;
  slot: MealSlotKey;
  meal: PlannedMeal;
}

interface MealPlannerProps {
  plan: MealPlanContent;
  onSelectMeal: (selection: SelectedMeal) => void;
}

function MealButton({ slot, meal, onClick }: { slot: MealSlotKey; meal: PlannedMeal; onClick: () => void }) {
  const { label, icon: Icon } = SLOT_META[slot];
  const shown = meal.ingredients.slice(0, 3);
  const extra = meal.ingredients.length - shown.length;
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full rounded-xl border border-white/5 bg-white/[0.03] p-3 text-left transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5"
    >
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-400/80">
        <Icon className="h-3 w-3" aria-hidden /> {label}
      </p>
      <p className="mt-1 line-clamp-2 text-sm font-medium text-white">{meal.title}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-white/45">
        <Clock className="h-3 w-3" aria-hidden /> {meal.prepTime} min
      </p>
      {shown.length > 0 && (
        <p className="mt-1.5 line-clamp-2 text-xs text-white/50">
          {shown.join(' · ')}
          {extra > 0 && ` +${extra}`}
        </p>
      )}
    </motion.button>
  );
}

/** Calendario settimanale: 7 colonne su desktop, accordion per giorno su mobile. */
export default function MealPlanner({ plan, onSelectMeal }: MealPlannerProps) {
  const today = toIsoDate(new Date());
  const isCurrentWeek = mondayOf() === plan.weekStart;
  const todayKey = WEEK_DAYS.find((d) => toIsoDate(dayDate(plan.weekStart, d)) === today);
  const [openDay, setOpenDay] = useState<WeekDay | null>(isCurrentWeek && todayKey ? todayKey : 'monday');

  return (
    <>
      {/* Desktop */}
      <div className="hidden gap-3 lg:grid lg:grid-cols-7">
        {WEEK_DAYS.map((day, i) => {
          const date = dayDate(plan.weekStart, day);
          const isToday = toIsoDate(date) === today;
          return (
            <motion.section
              key={day}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                'flex flex-col gap-2 rounded-2xl border bg-[#111827]/70 p-2.5',
                isToday ? 'border-emerald-500/60' : 'border-emerald-500/15',
              )}
            >
              <header className="px-1 pb-1">
                <p className={cn('text-sm font-semibold', isToday ? 'text-emerald-400' : 'text-white')}>{DAY_LABELS[day].slice(0, 3)}</p>
                <p className="text-xs text-white/40">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              </header>
              {MEAL_SLOTS.map((slot) => (
                <MealButton key={slot} slot={slot} meal={plan.days[day][slot]} onClick={() => onSelectMeal({ day, slot, meal: plan.days[day][slot] })} />
              ))}
            </motion.section>
          );
        })}
      </div>

      {/* Mobile / tablet */}
      <div className="space-y-2 lg:hidden">
        {WEEK_DAYS.map((day) => {
          const date = dayDate(plan.weekStart, day);
          const isOpen = openDay === day;
          const isToday = toIsoDate(date) === today;
          return (
            <section key={day} className={cn('overflow-hidden rounded-2xl border bg-[#111827]/70', isToday ? 'border-emerald-500/60' : 'border-emerald-500/15')}>
              <button
                type="button"
                onClick={() => setOpenDay(isOpen ? null : day)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span>
                  <span className={cn('font-semibold', isToday ? 'text-emerald-400' : 'text-white')}>{DAY_LABELS[day]}</span>
                  <span className="ml-2 text-xs text-white/40">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </span>
                <span className="flex items-center gap-2 text-xs text-white/40">
                  {!isOpen && <span className="hidden max-w-[10rem] truncate min-[400px]:inline">{plan.days[day].dinner.title}</span>}
                  <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} aria-hidden />
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="grid gap-2 px-3 pb-3 sm:grid-cols-3">
                      {MEAL_SLOTS.map((slot) => (
                        <MealButton key={slot} slot={slot} meal={plan.days[day][slot]} onClick={() => onSelectMeal({ day, slot, meal: plan.days[day][slot] })} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          );
        })}
      </div>
    </>
  );
}
