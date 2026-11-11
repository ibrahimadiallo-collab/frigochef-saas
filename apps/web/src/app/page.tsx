'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import FridgeInput from '@/components/FridgeInput';
import RecipeCard from '@/components/RecipeCard';
import ExpirationTracker from '@/components/ExpirationTracker';
import ReferralDashboard from '@/components/ReferralDashboard';
import MealPlanner from '@/components/MealPlanner';
import {
  Sparkles, Loader2, ArrowRight, ChefHat, Calendar,
  Refrigerator, Clock, Flame, Leaf, TrendingUp,
} from 'lucide-react';
import { authHeader } from '@/lib/supabase';
import { Recipe, MealPlan } from '@/lib/ai';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Stat Card singola ── */
function StatCard({
  icon, label, value, sublabel, accent, delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fc-stat-card"
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: accent ? `${accent}18` : 'rgba(23,76,60,0.08)',
          color: accent || 'var(--fc-forest)',
          marginBottom: 4,
        }}
      >
        {icon}
      </div>
      <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--fc-charcoal)', letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-charcoal)', opacity: 0.8 }}>
        {label}
      </span>
      {sublabel && (
        <span style={{ fontSize: 11, color: 'var(--fc-sage)', fontWeight: 500 }}>{sublabel}</span>
      )}
    </motion.div>
  );
}

/* ── Pagina principale ── */
export default function Home() {
  const [tags, setTags] = useState<string[]>([]);
  const [expiryItems, setExpiryItems] = useState<{ name: string; daysRemaining: number }[]>([]);
  const [mealType, setMealType] = useState('cena');
  const [time, setTime] = useState('normale');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPantryLoading, setIsPantryLoading] = useState(true);

  /* ── Caricamento dispensa ── */
  useEffect(() => {
    async function loadPantry() {
      try {
        const res = await fetch('/api/pantry', { headers: await authHeader() });
        if (res.ok) {
          const data = await res.json();
          if (data.ingredients) setTags(data.ingredients);
        }
      } catch (err) {
        console.error('Impossibile caricare la dispensa:', err);
      } finally {
        setIsPantryLoading(false);
      }
    }
    loadPantry();
  }, []);

  /* ── Auto-salvataggio dispensa ── */
  useEffect(() => {
    if (isPantryLoading) return;
    const save = async () => {
      try {
        await fetch('/api/pantry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
          body: JSON.stringify({ ingredients: tags }),
        });
      } catch (err) {
        console.error('Impossibile salvare la dispensa:', err);
      }
    };
    const id = setTimeout(save, 1000);
    return () => clearTimeout(id);
  }, [tags, isPantryLoading]);

  /* ── Genera ricetta ── */
  const handleGenerate = async () => {
    if (tags.length < 2) {
      setError('Aggiungi almeno 2 ingredienti per iniziare.');
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
      const msg = err instanceof Error ? err.message : 'Qualcosa è andato storto. Riprova.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Genera piano pasti ── */
  const handlePlanGenerate = async () => {
    if (tags.length < 2) {
      setError('Aggiungi qualche ingrediente per pianificare la settimana.');
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
      const msg = err instanceof Error ? err.message : 'Impossibile generare il piano pasti.';
      setError(msg);
    } finally {
      setIsPlanLoading(false);
    }
  };

  /* ── Dati per la stat cards ── */
  const urgentItems = expiryItems.filter((i) => i.daysRemaining <= 2);
  const availableRecipes = tags.length >= 2 ? Math.min(tags.length * 3, 24) : 0;

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--fc-cream)',
        overflowX: 'hidden',
      }}
    >
      <Navbar />

      <div
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          width: '100%',
          padding: '48px 24px 80px',
          display: 'flex',
          flexDirection: 'column',
          gap: 48,
        }}
      >
        {/* ════════════════════════════════════
            HERO — Greeting + Stat Cards
        ════════════════════════════════════ */}
        <section>
          {/* Greeting */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ marginBottom: 32 }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 14px',
                borderRadius: 999,
                background: 'rgba(217,233,163,0.5)',
                border: '1px solid rgba(217,233,163,0.9)',
                marginBottom: 16,
              }}
            >
              <Leaf size={12} style={{ color: 'var(--fc-forest)' }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--fc-forest)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                La tua cucina intelligente
              </span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(28px, 5vw, 48px)',
                fontWeight: 800,
                color: 'var(--fc-forest)',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                marginBottom: 10,
              }}
            >
              Cosa cuciniamo oggi?
            </h1>
            <p style={{ fontSize: 16, color: 'var(--fc-sage)', fontWeight: 500, maxWidth: 480 }}>
              Aggiungi gli ingredienti del tuo frigo e lascia che l'AI crei ricette perfette
              per te — riducendo gli sprechi e rispettando i tuoi gusti.
            </p>
          </motion.div>

          {/* Stat Cards */}
          {(tags.length > 0 || expiryItems.length > 0) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 12,
                marginBottom: 8,
              }}
            >
              <StatCard
                icon={<Refrigerator size={18} />}
                label="ingredienti"
                value={tags.length}
                sublabel="nella tua dispensa"
                delay={0}
              />
              {urgentItems.length > 0 && (
                <StatCard
                  icon={<Flame size={18} />}
                  label="da usare presto"
                  value={urgentItems.length}
                  sublabel="controlla il Radar"
                  accent="var(--fc-coral)"
                  delay={0.05}
                />
              )}
              {availableRecipes > 0 && (
                <StatCard
                  icon={<ChefHat size={18} />}
                  label="ricette possibili"
                  value={`~${availableRecipes}`}
                  sublabel="con i tuoi ingredienti"
                  accent="var(--fc-fresh)"
                  delay={0.10}
                />
              )}
              {mealPlan && (
                <StatCard
                  icon={<Calendar size={18} />}
                  label="pasti pianificati"
                  value={21}
                  sublabel="per tutta la settimana"
                  accent="#5b6fa8"
                  delay={0.15}
                />
              )}
            </div>
          )}
        </section>

        {/* ════════════════════════════════════
            LAYOUT PRINCIPALE — 2 colonne
        ════════════════════════════════════ */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 0.7fr)',
            gap: 32,
            alignItems: 'start',
          }}
          className="max-lg:grid-cols-1"
        >
          {/* ── COLONNA SINISTRA: Input + Risultati ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* Card generatore ricette */}
            <div className="fc-card" style={{ padding: '28px' }}>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: 'var(--fc-forest)',
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Sparkles size={18} style={{ color: 'var(--fc-lime)' }} />
                Genera una Ricetta
              </h2>

              {/* Input ingredienti */}
              {isPantryLoading ? (
                <div style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 className="animate-spin" size={24} style={{ color: 'var(--fc-sage)' }} />
                </div>
              ) : (
                <FridgeInput
                  tags={tags}
                  setTags={setTags}
                  onItemsAnalyzed={(items) => setExpiryItems((prev) => [...prev, ...items])}
                />
              )}

              {/* Selettori tipo pasto + tempo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                <div>
                  <label
                    htmlFor="meal-type-select"
                    className="fc-label"
                    style={{ display: 'block', marginBottom: 6 }}
                  >
                    Tipo di pasto
                  </label>
                  <select
                    id="meal-type-select"
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                    className="fc-input"
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="colazione">Colazione</option>
                    <option value="pranzo">Pranzo</option>
                    <option value="cena">Cena</option>
                    <option value="qualsiasi">Qualsiasi</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="time-select"
                    className="fc-label"
                    style={{ display: 'block', marginBottom: 6 }}
                  >
                    Tempo disponibile
                  </label>
                  <select
                    id="time-select"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="fc-input"
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="veloce">Veloce (15 min)</option>
                    <option value="normale">Standard (30 min)</option>
                    <option value="lento">Con calma (1h+)</option>
                  </select>
                </div>
              </div>

              {/* Messaggio di errore */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      marginTop: 12,
                      padding: '12px 16px',
                      background: 'rgba(233,139,112,0.1)',
                      border: '1px solid rgba(233,139,112,0.3)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--fc-coral)',
                    }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* CTA Pulsanti */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
                <button
                  id="generate-recipe-btn"
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="fc-btn-primary"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '15px',
                    fontSize: 15,
                    opacity: isLoading ? 0.75 : 1,
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      L'AI sta creando la ricetta…
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Genera Ricetta
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <button
                  id="generate-meal-plan-btn"
                  onClick={handlePlanGenerate}
                  disabled={isPlanLoading}
                  className="fc-btn-secondary"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '14px',
                    fontSize: 14,
                    opacity: isPlanLoading ? 0.75 : 1,
                  }}
                >
                  {isPlanLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Generazione piano in corso…
                    </>
                  ) : (
                    <>
                      <Calendar size={16} />
                      Genera Piano Settimanale
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Placeholder vuoto prima dei risultati */}
            {!recipe && !mealPlan && !isLoading && !isPlanLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="fc-card"
                style={{
                  padding: '48px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 16,
                  background: 'linear-gradient(135deg, rgba(23,76,60,0.03) 0%, rgba(217,233,163,0.08) 100%)',
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 24,
                    background: 'rgba(23,76,60,0.07)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--fc-sage)',
                  }}
                >
                  <ChefHat size={36} />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--fc-forest)', marginBottom: 6 }}>
                    La tua cucina ti aspetta
                  </h3>
                  <p style={{ fontSize: 14, color: 'var(--fc-sage)', maxWidth: 300, lineHeight: 1.6 }}>
                    Aggiungi gli ingredienti che hai in casa e l'AI creerà una ricetta su misura per te.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Ricetta generata */}
            <AnimatePresence>
              {recipe && <RecipeCard recipe={recipe} />}
            </AnimatePresence>

            {/* Piano pasti */}
            <AnimatePresence>
              {mealPlan && <MealPlanner plan={mealPlan} />}
            </AnimatePresence>
          </div>

          {/* ── COLONNA DESTRA: Radar + Pro + Referral ── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
            className="lg:sticky lg:top-24"
          >
            {/* Freshness Radar */}
            {expiryItems.length > 0 && (
              <div className="fc-card" style={{ padding: '24px' }}>
                <ExpirationTracker
                  items={expiryItems}
                  onFindRecipe={(ingredient) => {
                    setTags((prev) => (prev.includes(ingredient) ? prev : [ingredient, ...prev]));
                    document.getElementById('generate-recipe-btn')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                />
              </div>
            )}

            {/* Referral */}
            <ReferralDashboard />

            {/* Card Pro */}
            <div
              id="pricing"
              className="fc-card"
              style={{
                padding: '24px',
                background: 'linear-gradient(135deg, var(--fc-forest) 0%, #245e4a 100%)',
                border: 'none',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Decorativo */}
              <div
                style={{
                  position: 'absolute',
                  top: -30,
                  right: -30,
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background: 'rgba(217,233,163,0.08)',
                }}
              />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: 'rgba(217,233,163,0.2)',
                    marginBottom: 14,
                  }}
                >
                  <TrendingUp size={11} style={{ color: 'var(--fc-lime)' }} />
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--fc-lime)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                    Offerta Lancio
                  </span>
                </div>

                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 8 }}>
                  Passa a FrigoChef Pro
                </h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 20 }}>
                  Scansioni illimitate, piano alimentare avanzato, account famiglia e molto altro.
                </p>

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 20 }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    €5,99
                  </span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 3 }}>
                    /mese
                  </span>
                </div>

                <button
                  onClick={async () => {
                    const res = await fetch('/api/stripe/checkout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
                      body: JSON.stringify({ priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || 'price_placeholder' }),
                    });
                    const data = await res.json();
                    if (data.url) window.location.href = data.url;
                  }}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'var(--fc-lime)',
                    color: 'var(--fc-forest)',
                    fontWeight: 800,
                    fontSize: 14,
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    cursor: 'pointer',
                    letterSpacing: '-0.01em',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  Passa a Pro Ora
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer
        style={{
          borderTop: '1px solid var(--fc-border)',
          padding: '28px 24px',
          background: '#fff',
          marginTop: 'auto',
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fc-forest)' }}>
              FrigoChef
            </span>
            <span style={{ fontSize: 12, color: 'var(--fc-sage)' }}>© 2025 · La tua cucina, più intelligente.</span>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy', 'Termini', 'Contatti'].map((link) => (
              <a
                key={link}
                href="#"
                style={{ fontSize: 12, color: 'var(--fc-sage)', fontWeight: 500, textDecoration: 'none' }}
                onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = 'var(--fc-fresh)')}
                onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = 'var(--fc-sage)')}
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
