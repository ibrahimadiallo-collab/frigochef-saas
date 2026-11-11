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
      <div style={{ minHeight: '100vh', background: 'var(--fc-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" style={{ color: 'var(--fc-fresh)' }} size={36} />
      </div>
    );
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--fc-cream)' }}>
      <Navbar />

      <div style={{ maxWidth: 1120, margin: '0 auto', width: '100%', padding: '40px 24px 80px', display: 'flex', flexDirection: 'column', gap: 36 }}>
        <header>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 14px',
              borderRadius: 999,
              background: 'rgba(217,233,163,0.5)',
              border: '1px solid rgba(217,233,163,0.9)',
              marginBottom: 14,
            }}
          >
            <BookOpen size={12} style={{ color: 'var(--fc-forest)' }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--fc-forest)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              Ricettario Personale
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, color: 'var(--fc-forest)', letterSpacing: '-0.03em', marginBottom: 8 }}>
            Le Mie Ricette
          </h1>
          <p style={{ fontSize: 15, color: 'var(--fc-sage)', maxWidth: 480 }}>
            Tutte le ricette che hai creato con l&apos;AI, salvate in un unico posto per cucinarle quando vuoi.
          </p>
        </header>

        {!user ? (
          <div
            className="fc-card"
            style={{
              padding: '56px 32px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 20,
                background: 'rgba(23,76,60,0.07)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--fc-sage)',
              }}
            >
              <ChefHat size={34} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--fc-forest)' }}>
              Accedi per vedere il tuo ricettario
            </h3>
            <p style={{ fontSize: 14, color: 'var(--fc-sage)', maxWidth: 380, lineHeight: 1.6 }}>
              Le ricette vengono salvate automaticamente sul tuo account così puoi consultarle da qualsiasi dispositivo.
            </p>
            <Link
              href="/"
              className="fc-btn-primary"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 8 }}
            >
              Torna alla Dashboard <ArrowRight size={16} />
            </Link>
          </div>
        ) : recipes.length === 0 ? (
          <div
            className="fc-card"
            style={{
              padding: '56px 32px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 20,
                background: 'rgba(217,233,163,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--fc-forest)',
              }}
            >
              <Sparkles size={32} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--fc-forest)' }}>
              Nessuna ricetta salvata
            </h3>
            <p style={{ fontSize: 14, color: 'var(--fc-sage)', maxWidth: 380, lineHeight: 1.6 }}>
              Inizia a generare ricette con gli ingredienti del tuo frigo per costruire il tuo ricettario personale.
            </p>
            <Link
              href="/"
              className="fc-btn-primary"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 8 }}
            >
              Genera la tua prima ricetta <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {recipes.map((r) => (
              <RecipeCard key={r.id} recipe={{ ...r.recipe_data, id: r.id }} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
