'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import MealPlanner from '@/components/MealPlanner';
import SmartShoppingList from '@/components/SmartShoppingList';
import {
  Calendar, Sparkles, Loader2, ShoppingCart,
  RefreshCw, Zap, ChevronRight
} from 'lucide-react';
import { authHeader } from '@/lib/supabase';
import { MealPlan } from '@/lib/ai';
import { motion, AnimatePresence } from 'framer-motion';

export default function PlannerPage() {
  const [pantryTags, setPantryTags] = useState<string[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pantryLoaded, setPantryLoaded] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);

  /* ── Carica dispensa ── */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/pantry', { headers: await authHeader() });
        if (res.ok) {
          const data = await res.json();
          if (data.ingredients) setPantryTags(data.ingredients);
        }
      } catch {
        // dispensa non disponibile
      } finally {
        setPantryLoaded(true);
      }
    }
    load();
  }, []);

  /* ── Genera piano pasti ── */
  const handleGenerate = async () => {
    if (pantryTags.length < 2) {
      setError('Aggiungi almeno 2 ingredienti nel tuo Frigo per generare il piano.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: pantryTags.join(', ') }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMealPlan(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Impossibile generare il piano pasti.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: 'var(--fc-cream)' }}>
      <Navbar />

      <div className="fc-container" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start', justifyContent: 'space-between' }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'rgba(23,76,60,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--fc-forest)',
                }}
              >
                <Calendar size={20} />
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--fc-forest)', letterSpacing: '-0.03em' }}>
                Piano Pasti Settimanale
              </h1>
            </div>
            <p style={{ fontSize: 14, color: 'var(--fc-sage)', maxWidth: 460 }}>
              L'AI crea un piano di 7 giorni bilanciato usando gli ingredienti che hai già a casa,
              riducendo gli sprechi e ottimizzando gli acquisti.
            </p>
          </div>

          {/* Pulsante genera */}
          <button
            id="generate-plan-btn"
            onClick={handleGenerate}
            disabled={isLoading || !pantryLoaded}
            className="fc-btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 24px',
              fontSize: 15,
              opacity: (isLoading || !pantryLoaded) ? 0.75 : 1,
              flexShrink: 0,
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Generazione in corso…
              </>
            ) : mealPlan ? (
              <>
                <RefreshCw size={18} />
                Rigenera Piano
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Genera Piano con l'AI
              </>
            )}
          </button>
        </motion.div>

        {/* Info dispensa */}
        {pantryLoaded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 20px',
              background: 'var(--fc-surface)',
              border: '1px solid var(--fc-border)',
              borderRadius: 'var(--radius-md)',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px',
                borderRadius: 999,
                background: pantryTags.length >= 2 ? 'rgba(217,233,163,0.5)' : 'rgba(233,139,112,0.1)',
                border: `1px solid ${pantryTags.length >= 2 ? 'rgba(217,233,163,0.9)' : 'rgba(233,139,112,0.3)'}`,
              }}
            >
              <span
                style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: pantryTags.length >= 2 ? 'var(--fc-fresh)' : 'var(--fc-coral)',
                  display: 'block',
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 700, color: pantryTags.length >= 2 ? 'var(--fc-forest)' : 'var(--fc-coral)' }}>
                {pantryTags.length >= 2
                  ? `${pantryTags.length} ingredienti disponibili`
                  : 'Aggiungi ingredienti al tuo Frigo'}
              </span>
            </div>

            {pantryTags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {pantryTags.slice(0, 8).map((tag) => (
                  <span key={tag} className="fc-chip" style={{ fontSize: 12 }}>
                    {tag}
                  </span>
                ))}
                {pantryTags.length > 8 && (
                  <span style={{ fontSize: 12, color: 'var(--fc-sage)', alignSelf: 'center' }}>
                    +{pantryTags.length - 8} altri
                  </span>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Errore */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                padding: '14px 18px',
                background: 'rgba(233,139,112,0.1)',
                border: '1px solid rgba(233,139,112,0.3)',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--fc-coral)',
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Piano pasti */}
        <AnimatePresence>
          {mealPlan && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <MealPlanner plan={mealPlan} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stato vuoto — prima della generazione */}
        {!mealPlan && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
            }}
          >
            {[
              {
                icon: <Zap size={22} style={{ color: 'var(--fc-fresh)' }} />,
                title: 'Piano Personalizzato',
                desc: "L'AI crea un piano di 7 giorni bilanciato basandosi sugli ingredienti che hai già a casa.",
                bg: 'rgba(50,133,103,0.05)',
                border: 'rgba(50,133,103,0.15)',
              },
              {
                icon: <ShoppingCart size={22} style={{ color: '#5b6fa8' }} />,
                title: 'Lista della Spesa',
                desc: "Dopo la generazione, esporta automaticamente la lista degli ingredienti mancanti.",
                bg: 'rgba(91,111,168,0.05)',
                border: 'rgba(91,111,168,0.15)',
              },
              {
                icon: <RefreshCw size={22} style={{ color: 'var(--fc-coral)' }} />,
                title: 'Rigenera quando vuoi',
                desc: "Non ti piace un pasto? Puoi rigenerare l'intero piano o sostituire singoli giorni.",
                bg: 'rgba(233,139,112,0.06)',
                border: 'rgba(233,139,112,0.2)',
              },
            ].map(({ icon, title, desc, bg, border }) => (
              <div
                key={title}
                className="fc-card"
                style={{
                  padding: '24px',
                  background: bg,
                  border: `1px solid ${border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: '#fff',
                    border: '1px solid var(--fc-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 4,
                  }}
                >
                  {icon}
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--fc-charcoal)' }}>{title}</h3>
                <p style={{ fontSize: 13, color: 'var(--fc-sage)', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* CTA Lista della spesa (dopo generazione) */}
        {mealPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div
              className="fc-card"
              style={{
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShoppingCart size={18} style={{ color: 'var(--fc-fresh)' }} />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--fc-charcoal)' }}>
                    Lista della Spesa Settimanale
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--fc-sage)' }}>
                    Genera automaticamente l&apos;elenco degli ingredienti da acquistare per i piatti della settimana
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowShoppingList(!showShoppingList)}
                className="fc-btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', fontSize: 13 }}
              >
                {showShoppingList ? 'Nascondi Lista' : 'Mostra Lista'}
                <ChevronRight size={14} />
              </button>
            </div>

            {showShoppingList && (
              <SmartShoppingList
                recipeIngredients={mealPlan.flatMap((d) => [d.colazione.nome, d.pranzo.nome, d.cena.nome])}
                pantryIngredients={pantryTags}
              />
            )}
          </motion.div>
        )}
      </div>
    </main>
  );
}
