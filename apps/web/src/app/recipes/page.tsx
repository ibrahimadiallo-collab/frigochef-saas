'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import RecipeCard from '@/components/RecipeCard';
import { supabase } from '@/lib/supabase';
import { Loader2, ChefHat, Sparkles, ArrowRight, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { Recipe } from '@/lib/ai';
import { User } from '@supabase/supabase-js';

interface SavedRecipe {
  id: string;
  recipe_data: Recipe;
  user_id: string;
  created_at: string;
}

export default function MyRecipesPage() {
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function loadRecipes() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      if (authUser) {
        const { data, error } = await supabase
          .from('recipes')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setRecipes(data as SavedRecipe[]);
        }
      }
      setIsLoading(false);
    }
    loadRecipes();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020202] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-[#020202] text-white">
      <Navbar />
      
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-20 md:py-32 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] pointer-events-none" />

        <div className="space-y-12">
          <header className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold tracking-widest uppercase border border-emerald-500/20">
              <BookOpen size={12} /> Personal Collection
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter">
              My Recipes
            </h1>
            <p className="text-white/40 text-lg max-w-lg">
              Every masterpiece you&apos;ve generated, saved in one place.
            </p>
          </header>

          {!user ? (
            <div className="p-12 bg-white/[0.02] border border-white/5 rounded-[40px] text-center space-y-6">
              <ChefHat size={48} className="mx-auto text-white/10" />
              <h3 className="text-2xl font-bold">Sign in to see your collection</h3>
              <p className="text-white/40 max-w-md mx-auto">
                Your recipes are saved to your account so you can access them anywhere.
              </p>
              <Link 
                href="/" 
                className="inline-flex h-14 px-8 bg-white text-black rounded-2xl font-bold items-center justify-center hover:bg-emerald-500 transition-all"
              >
                Go to Home
              </Link>
            </div>
          ) : recipes.length === 0 ? (
            <div className="p-12 bg-white/[0.02] border border-white/5 rounded-[40px] text-center space-y-6">
              <Sparkles size={48} className="mx-auto text-white/10" />
              <h3 className="text-2xl font-bold">No recipes yet</h3>
              <p className="text-white/40 max-w-md mx-auto">
                Start generating with AI to build your personal digital cookbook.
              </p>
              <Link 
                href="/" 
                className="inline-flex h-14 px-8 bg-emerald-500 text-black rounded-2xl font-bold items-center justify-center hover:bg-emerald-400 transition-all gap-2"
              >
                Generate First Recipe <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <div className="grid gap-12">
              {recipes.map((r) => (
                <div key={r.id} className="relative group">
                   <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-[42px] blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                   <div className="relative">
                     <RecipeCard recipe={{...r.recipe_data, id: r.id}} />
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
