'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import FridgeInput from '@/components/FridgeInput';
import RecipeCard from '@/components/RecipeCard';
import ExpirationTracker from '@/components/ExpirationTracker';
import ReferralDashboard from '@/components/ReferralDashboard';
import MealPlanner from '@/components/MealPlanner';
import { Sparkles, Loader2, ArrowRight, ChefHat, Calendar } from 'lucide-react';
import { authHeader } from '@/lib/supabase';
import { Recipe, MealPlan } from '@/lib/ai';

export default function Home() {
  const [tags, setTags] = useState<string[]>([]);
  const [expiryItems, setExpiryItems] = useState<{ name: string; daysRemaining: number }[]>([]);
  const [mealType, setMealType] = useState('dinner');
  const [time, setTime] = useState('normal');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPantryLoading, setIsPantryLoading] = useState(true);

  // Load Pantry on mount
  useEffect(() => {
    async function loadPantry() {
      try {
        const res = await fetch('/api/pantry', { headers: await authHeader() });
        if (res.ok) {
          const data = await res.json();
          if (data.ingredients) setTags(data.ingredients);
        }
      } catch (err) {
        console.error("Failed to load pantry:", err);
      } finally {
        setIsPantryLoading(false);
      }
    }
    loadPantry();
  }, []);

  // Save Pantry when tags change (Simple auto-save)
  useEffect(() => {
    if (isPantryLoading) return;

    const savePantry = async () => {
      try {
        await fetch('/api/pantry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
          body: JSON.stringify({ ingredients: tags }),
        });
      } catch (err) {
        console.error("Failed to save pantry:", err);
      }
    };

    const timeoutId = setTimeout(savePantry, 1000);
    return () => clearTimeout(timeoutId);
  }, [tags, isPantryLoading]);

  const handleGenerate = async () => {
    if (tags.length < 2) {
      setError('Add at least 2 ingredients to begin.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setRecipe(null);

    try {
      const res = await fetch('/api/recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: tags.join(', '), mealType, time }),
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRecipe(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanGenerate = async () => {
    if (tags.length < 2) {
      setError('Add some ingredients to plan your week.');
      return;
    }

    setIsPlanLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: tags.join(', ') }),
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMealPlan(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate meal plan.';
      setError(message);
    } finally {
      setIsPlanLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-[#020202] text-white overflow-x-hidden">
      <Navbar />
      
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-20 md:py-32 relative">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] pointer-events-none" />

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-20 items-start">
          
          {/* LEFT: Branding & Input */}
          <div className="space-y-12">
            <header className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold tracking-widest uppercase border border-emerald-500/20">
                <Sparkles size={12} /> Intelligence v2.0
              </div>
              <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tighter">
                Turn your fridge <br />
                <span className="text-emerald-500">into dinner.</span>
              </h1>
              <p className="text-white/40 text-lg md:text-xl font-medium max-w-lg leading-relaxed">
                Stop wasting, start cooking. Take a photo or list your ingredients and let AI design your perfect meal in seconds.
              </p>
            </header>

            <div className="space-y-8 max-w-md">
              <div className="p-1 bg-white/5 border border-white/10 rounded-[24px]">
                {isPantryLoading ? (
                  <div className="h-[140px] flex items-center justify-center bg-white/[0.03] rounded-[20px]">
                    <Loader2 className="animate-spin text-emerald-500/50" size={24} />
                  </div>
                ) : (
                  <FridgeInput 
                    tags={tags} 
                    setTags={setTags} 
                    onItemsAnalyzed={(items) => setExpiryItems(prev => [...prev, ...items])}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">
                    Meal Type
                  </label>
                  <select 
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-colors appearance-none cursor-pointer text-white/80"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="any">Any</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">
                    Duration
                  </label>
                  <select 
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-colors appearance-none cursor-pointer text-white/80"
                  >
                    <option value="fast">Express</option>
                    <option value="normal">Standard</option>
                    <option value="slow">Slow Cook</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl animate-in fade-in slide-in-from-top-2">
                  {error}
                </div>
              )}

              <button 
                onClick={handleGenerate}
                disabled={isLoading}
                className="group relative w-full bg-white text-black h-16 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all hover:bg-emerald-500 hover:scale-[1.02] active:scale-[0.98] shadow-[0_20px_40px_rgba(0,0,0,0.4)] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 flex items-center gap-2">
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Generate Masterpiece <ArrowRight size={20} />
                    </>
                  )}
                </span>
              </button>

              <button 
                onClick={handlePlanGenerate}
                disabled={isPlanLoading}
                className="w-full bg-white/5 border border-white/10 h-14 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all hover:bg-white/10 active:scale-[0.98] text-white/60 hover:text-white"
              >
                {isPlanLoading ? (
                  <>
                    <Loader2 className="animate-spin text-emerald-500" size={18} />
                    Planning Week...
                  </>
                ) : (
                  <>
                    <Calendar size={18} /> Generate Weekly Plan
                  </>
                )}
              </button>
            </div>

            {/* Result Area */}
            <div className="pt-12 space-y-12">
              {recipe && (
                <div className="animate-in fade-in zoom-in-95 duration-500">
                  <RecipeCard recipe={recipe} />
                </div>
              )}

              {mealPlan && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                  <MealPlanner plan={mealPlan} />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Freshness Radar & Insights */}
          <div className="lg:sticky lg:top-28 space-y-12">
            {expiryItems.length > 0 && (
              <ExpirationTracker items={expiryItems} />
            )}

            <ReferralDashboard />

            {!recipe && expiryItems.length === 0 && (
              <div className="relative aspect-square md:aspect-auto md:h-[600px] bg-white/[0.02] border border-white/5 rounded-[48px] flex flex-col items-center justify-center p-12 text-center overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                
                <div className="relative z-10 space-y-6">
                  <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-[32px] flex items-center justify-center text-white/10 mx-auto group-hover:scale-110 group-hover:text-emerald-500/40 transition-all duration-700">
                    <ChefHat size={48} />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold tracking-tight">Your Kitchen, Digitized.</h3>
                    <p className="text-white/30 text-base max-w-[280px] mx-auto leading-relaxed">
                      Add ingredients or snap a photo to let the engine create your next culinary experience.
                    </p>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute bottom-10 left-10 w-20 h-20 border border-white/5 rounded-2xl rotate-12" />
                <div className="absolute top-20 right-10 w-12 h-12 border border-white/5 rounded-full" />
              </div>
            )}
          </div>

        </div>
      </div>

      <footer className="border-t border-white/5 py-12 bg-black/50 backdrop-blur-sm mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8 text-white/20 text-[10px] font-bold uppercase tracking-[0.3em]">
          <div className="flex items-center gap-6">
            <span>© 2025 FRIGOCHEF</span>
            <span className="w-1 h-1 rounded-full bg-white/10" />
            <a href="#" className="hover:text-emerald-500 transition-colors">Privacy</a>
            <a href="#" className="hover:text-emerald-500 transition-colors">Terms</a>
          </div>
          <div className="text-white/10">
            Engineered for Precision & Taste
          </div>
        </div>
      </footer>
    </main>
  );
}
