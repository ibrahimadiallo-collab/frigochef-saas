'use client';

import { useState } from 'react';
import { Calendar, Clock, Flame, ChevronRight, Sparkles, ChefHat } from 'lucide-react';
import { MealPlan } from '@/lib/ai';

interface MealPlannerProps {
  plan: MealPlan;
}

export default function MealPlanner({ plan }: MealPlannerProps) {
  const [activeDay, setActiveDay] = useState(0);

  const day = plan[activeDay];

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-[40px] overflow-hidden backdrop-blur-2xl">
      {/* Header */}
      <div className="p-8 border-b border-white/5 bg-gradient-to-br from-emerald-500/5 to-transparent flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-black text-white flex items-center gap-3">
            <Calendar className="text-emerald-500" />
            Weekly Meal Planner
          </h3>
          <p className="text-sm text-white/40 mt-1 font-medium">Il tuo piano alimentare personalizzato basato sulla dispensa.</p>
        </div>
        
        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
          {plan.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveDay(i)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                activeDay === i 
                ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]' 
                : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              {['L', 'M', 'M', 'G', 'V', 'S', 'D'][i]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-8 grid md:grid-cols-3 gap-6">
        {[
          { type: 'Colazione', data: day.colazione, icon: <Sparkles size={18} className="text-amber-400" /> },
          { type: 'Pranzo', data: day.pranzo, icon: <ChefHat size={18} className="text-emerald-400" /> },
          { type: 'Cena', data: day.cena, icon: <Clock size={18} className="text-blue-400" /> }
        ].map((meal, i) => (
          <div key={i} className="group relative bg-white/5 border border-white/5 rounded-[32px] p-6 hover:border-emerald-500/30 transition-all hover:translate-y-[-4px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                {meal.icon}
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{meal.type}</span>
            </div>

            <h4 className="text-lg font-bold text-white mb-4 line-clamp-2 leading-tight group-hover:text-emerald-400 transition-colors">
              {meal.data.nome}
            </h4>

            <div className="flex items-center gap-4 mt-auto">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white/60">
                <Clock size={14} className="text-white/20" />
                {meal.data.tempo}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-white/60">
                <Flame size={14} className="text-white/20" />
                {meal.data.calorie} kcal
              </div>
            </div>

            <button className="absolute bottom-6 right-6 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-white/10 hover:bg-emerald-500 hover:text-black hover:border-emerald-500">
              <ChevronRight size={18} />
            </button>
          </div>
        ))}
      </div>

      {/* Footer / CTA */}
      <div className="p-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-center">
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] flex items-center gap-2">
          <Sparkles size={12} className="text-emerald-500" />
          Pro-only: Sync with Shopping List
        </p>
      </div>
    </div>
  );
}
