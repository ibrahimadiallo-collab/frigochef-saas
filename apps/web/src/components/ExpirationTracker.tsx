'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, Clock, Calendar } from 'lucide-react';

interface ExpiryItem {
  name: string;
  daysRemaining: number;
}

interface ExpirationTrackerProps {
  items: ExpiryItem[];
}

export default function ExpirationTracker({ items }: ExpirationTrackerProps) {
  if (items.length === 0) return null;

  // Sort by urgency
  const sortedItems = [...items].sort((a, b) => a.daysRemaining - b.daysRemaining);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-700">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 flex items-center gap-2">
          <Clock size={12} /> Freshness Radar
        </h3>
        <span className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-widest">
          AI Estimates
        </span>
      </div>

      <div className="grid gap-3">
        {sortedItems.map((item, i) => {
          const isUrgent = item.daysRemaining <= 2;
          const isWarning = item.daysRemaining > 2 && item.daysRemaining <= 4;
          
          return (
            <motion.div
              key={`${item.name}-${i}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`p-4 rounded-2xl border flex items-center justify-between group transition-all ${
                isUrgent 
                  ? 'bg-red-500/5 border-red-500/20' 
                  : isWarning 
                  ? 'bg-orange-500/5 border-orange-500/20' 
                  : 'bg-white/[0.02] border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
                  isUrgent 
                    ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                    : isWarning 
                    ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' 
                    : 'bg-white/5 border-white/10 text-white/40 group-hover:text-emerald-500'
                }`}>
                  {isUrgent ? <AlertTriangle size={18} /> : <Calendar size={18} />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white/80 capitalize">{item.name}</h4>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${
                    isUrgent ? 'text-red-500/60' : isWarning ? 'text-orange-500/60' : 'text-white/20'
                  }`}>
                    {item.daysRemaining} days left
                  </p>
                </div>
              </div>

              {/* Urgency Progress Bar */}
              <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(10, 100 - (item.daysRemaining * 10))}%` }}
                  className={`h-full ${
                    isUrgent ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-emerald-500/40'
                  }`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
        <p className="text-[10px] font-medium text-emerald-500/60 leading-relaxed italic">
          &quot;Pro tip: Use the {sortedItems[0].name} today in a quick express recipe to reduce waste.&quot;
        </p>
      </div>
    </div>
  );
}
