'use client';

import { useState } from 'react';
import { Clock, Users, BarChart, Copy, Share2, Sparkles, Play, Check } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import CookMode from './CookMode';
import SocialShare from './SocialShare';

interface Recipe {
  id?: string;
  nome: string;
  tempo: string;
  porzioni: string;
  difficolta: string;
  nutrizione?: {
    calorie: number;
    proteine: string;
    carboidrati: string;
    grassi: string;
  };
  sostenibilita?: number;
  ingredienti: string[];
  passaggi: string[];
}

interface RecipeCardProps {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const [isCookModeOpen, setIsCookModeOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const copyToClipboard = () => {
    const text = `${recipe.nome}\n\nIngredienti:\n${recipe.ingredienti.join('\n')}\n\nProcedimento:\n${recipe.passaggi.join('\n')}`;
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      <div className="bg-white/[0.02] border border-white/10 rounded-[40px] overflow-hidden shadow-2xl backdrop-blur-sm animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Header Section */}
        <div className="p-8 md:p-12 bg-gradient-to-br from-emerald-500/10 to-transparent border-b border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Sparkles size={120} className="text-emerald-500" />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 text-emerald-500">
                <Sparkles size={16} />
                <span className="text-[10px] font-bold tracking-[0.3em] uppercase">AI Masterpiece</span>
              </div>
              
              {recipe.sostenibilita && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                    Sustainability {recipe.sostenibilita}/100
                  </span>
                </div>
              )}
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tighter max-w-2xl">
              {recipe.nome}
            </h2>
            
            <div className="flex flex-wrap gap-8 pt-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold tracking-widest uppercase text-white/20 flex items-center gap-2">
                  <Clock size={12} /> Time
                </p>
                <p className="text-sm font-bold text-white/80">{recipe.tempo}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold tracking-widest uppercase text-white/20 flex items-center gap-2">
                  <Users size={12} /> Portions
                </p>
                <p className="text-sm font-bold text-white/80">{recipe.porzioni}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold tracking-widest uppercase text-white/20 flex items-center gap-2">
                  <BarChart size={12} /> Difficulty
                </p>
                <p className="text-sm font-bold text-white/80">{recipe.difficolta}</p>
              </div>
            </div>

            {/* Nutrition Panel - The Billion Dollar Value Add */}
            {recipe.nutrizione && (
              <div className="grid grid-cols-4 gap-4 p-6 bg-white/5 rounded-3xl border border-white/5">
                <div className="text-center space-y-1">
                  <p className="text-2xl font-bold text-white">{recipe.nutrizione.calorie}</p>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Kcal</p>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-2xl font-bold text-emerald-500">{recipe.nutrizione.proteine}</p>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Protein</p>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-2xl font-bold text-blue-400">{recipe.nutrizione.carboidrati}</p>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Carbs</p>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-2xl font-bold text-amber-400">{recipe.nutrizione.grassi}</p>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Fats</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid md:grid-cols-[1fr_1.5fr] divide-y md:divide-y-0 md:divide-x divide-white/5">
          
          {/* Ingredients Column */}
          <div className="p-8 md:p-12 space-y-8 bg-white/[0.01]">
            <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 border-b border-white/5 pb-4">
              Ingredients
            </h3>
            <ul className="space-y-5">
              {recipe.ingredienti.map((ing, i) => (
                <li key={i} className="text-sm font-medium text-white/60 flex items-start gap-4 group">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 mt-1.5 group-hover:bg-emerald-500 transition-colors" />
                  {ing}
                </li>
              ))}
            </ul>
          </div>

          {/* Steps Column (Preview) */}
          <div className="p-8 md:p-12 space-y-8">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">
                Procedure
              </h3>
              <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                {recipe.passaggi.length} steps
              </span>
            </div>
            
            <ol className="space-y-8">
              {recipe.passaggi.slice(0, 3).map((step, i) => (
                <li key={i} className="flex gap-6 group">
                  <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-mono font-bold flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:text-emerald-500 group-hover:border-emerald-500/20 transition-all">
                    {(i + 1).toString().padStart(2, '0')}
                  </span>
                  <p className="text-sm leading-relaxed text-white/40 group-hover:text-white/80 transition-colors">
                    {step}
                  </p>
                </li>
              ))}
              {recipe.passaggi.length > 3 && (
                <li className="pl-14 text-xs font-bold uppercase tracking-widest text-white/10">
                  + {recipe.passaggi.length - 3} more steps
                </li>
              )}
            </ol>

            {/* CTA Overlay for preview */}
            <div className="pt-8">
              <button 
                onClick={() => setIsCookModeOpen(true)}
                className="w-full h-20 bg-emerald-500 text-black rounded-3xl font-bold flex items-center justify-center gap-3 hover:bg-emerald-400 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_20px_40px_rgba(16,185,129,0.2)]"
              >
                <Play size={20} fill="currentColor" />
                START COOKING MODE
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-black/40 p-6 flex justify-between items-center border-t border-white/5 backdrop-blur-md">
          <div className="flex gap-3">
            <button 
              onClick={copyToClipboard}
              className="p-3 rounded-xl border border-white/5 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
            >
              <Copy size={14} /> Copy
            </button>
            <button 
              onClick={() => setIsShareOpen(true)}
              className="p-3 rounded-xl border border-white/5 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
            >
              <Share2 size={14} /> Share
            </button>
          </div>
          <button className="text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-2">
            <Check size={14} /> Save to Cookbook
          </button>
        </div>
      </div>

      {/* Fullscreen Cook Mode Portal-like implementation */}
      <AnimatePresence>
        {isCookModeOpen && (
          <CookMode 
            recipe={recipe} 
            onClose={() => setIsCookModeOpen(false)} 
          />
        )}
      </AnimatePresence>

      <SocialShare 
        recipe={recipe} 
        isOpen={isShareOpen} 
        onClose={() => setIsShareOpen(false)} 
      />
    </>
  );
}
