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
  Refrigerator, Flame, TrendingUp, Star, CheckCircle2, Camera, Utensils
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
          background: accent ? `${accent}18` : 'rgba(50,133,103,0.12)',
          color: accent || 'var(--fc-fresh)',
          marginBottom: 4,
        }}
      >
        {icon}
      </div>
      <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--fc-charcoal)', letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-charcoal)', opacity: 0.85 }}>
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
    const id = setTimeout(save, 800);
    return () => clearTimeout(id);
  }, [tags, isPantryLoading]);

  /* ── Genera ricetta ── */
  const handleGenerate = async () => {
    if (tags.length < 2) {
      setError('Aggiungi almeno 2 ingredienti (o toccali dai suggerimenti rapidi) per iniziare.');
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
      setError('Aggiungi almeno 2 ingredienti per pianificare la settimana.');
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

      <div className="fc-container" style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
        {/* ════════════════════════════════════
            HERO — Social Proof + Headline + Value Props
        ════════════════════════════════════ */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            {/* Social Proof Pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 999,
                background: 'rgba(50,133,103,0.12)',
                border: '1px solid rgba(50,133,103,0.28)',
                alignSelf: 'flex-start',
              }}
            >
              <div style={{ display: 'flex', color: '#E6A100' }}>
                <Star size={12} fill="currentColor" />
                <Star size={12} fill="currentColor" />
                <Star size={12} fill="currentColor" />
                <Star size={12} fill="currentColor" />
                <Star size={12} fill="currentColor" />
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--fc-forest)', letterSpacing: '0.02em' }}>
                4.9/5 • Oltre 2.400 cucine smart in Italia
              </span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(30px, 6vw, 52px)',
                fontWeight: 800,
                color: 'var(--fc-forest)',
                letterSpacing: '-0.035em',
                lineHeight: 1.08,
                maxWidth: 680,
              }}
            >
              Trasforma ciò che hai in frigo nel tuo prossimo piatto.
            </h1>

            <p style={{ fontSize: 16, color: 'var(--fc-sage)', fontWeight: 500, maxWidth: 560, lineHeight: 1.55 }}>
              Scatta una foto al frigorifero o seleziona gli ingredienti disponibili: il nostro
              Chef AI crea ricette su misura, calcola le calorie e azzera gli sprechi.
            </p>

            {/* Value Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, paddingTop: 4 }}>
              {[
                'Ricette pronte in 5 secondi',
                'Valori nutrizionali inclusi',
                'Fino a 120 €/mese risparmiati',
              ].map((badge) => (
                <div
                  key={badge}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--fc-charcoal)',
                  }}
                >
                  <CheckCircle2 size={14} style={{ color: 'var(--fc-fresh)', flexShrink: 0 }} />
                  <span>{badge}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Stat Cards */}
          {(tags.length > 0 || expiryItems.length > 0) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
                gap: 12,
                marginTop: 24,
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
                  delay={0.1}
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
            LAYOUT PRINCIPALE — Responsive Grid
        ════════════════════════════════════ */}
        <div className="fc-dashboard-grid">
          {/* ── COLONNA SINISTRA: Input + Risultati ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Card generatore ricette */}
            <div className="fc-card" style={{ padding: '24px 20px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 18,
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <h2
                  style={{
                    fontSize: 19,
                    fontWeight: 800,
                    color: 'var(--fc-forest)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Sparkles size={19} style={{ color: 'var(--fc-fresh)' }} />
                  Crea la tua Ricetta con l&apos;AI
                </h2>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: 'rgba(50,133,103,0.12)',
                    color: 'var(--fc-fresh)',
                  }}
                >
                  Gemini 2.0 Flash
                </span>
              </div>

              {/* Input ingredienti */}
              {isPantryLoading ? (
                <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              <div className="fc-select-grid" style={{ marginTop: 18 }}>
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
                    <option value="colazione">🌅 Colazione</option>
                    <option value="pranzo">☀️ Pranzo</option>
                    <option value="cena">🌙 Cena</option>
                    <option value="qualsiasi">✨ Qualsiasi</option>
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
                    <option value="veloce">⚡ Veloce (15 min)</option>
                    <option value="normale">⏱️ Standard (30 min)</option>
                    <option value="lento">🍲 Con calma (1h+)</option>
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
                      marginTop: 14,
                      padding: '12px 16px',
                      background: 'rgba(224,109,83,0.12)',
                      border: '1px solid rgba(224,109,83,0.35)',
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
                      Lo Chef AI sta creando la ricetta…
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Genera Ricetta Ora
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
                      Pianificazione settimanale…
                    </>
                  ) : (
                    <>
                      <Calendar size={16} />
                      Genera Piano Pasti di 7 Giorni
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Ricetta generata */}
            <AnimatePresence>
              {recipe && <RecipeCard recipe={recipe} />}
            </AnimatePresence>

            {/* Piano pasti */}
            <AnimatePresence>
              {mealPlan && <MealPlanner plan={mealPlan} />}
            </AnimatePresence>

            {/* Sezione "Come funziona" (visibile quando non c'è ancora una ricetta) */}
            {!recipe && !mealPlan && !isLoading && !isPlanLoading && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 14,
                }}
              >
                {[
                  {
                    step: '01',
                    icon: <Camera size={20} />,
                    title: 'Scansiona o inserisci',
                    desc: 'Fotografa il frigo o tocca gli ingredienti che hai già in casa.',
                  },
                  {
                    step: '02',
                    icon: <Sparkles size={20} />,
                    title: 'Ricetta su misura',
                    desc: "L'AI combina i sapori migliori e dà priorità ai cibi in scadenza.",
                  },
                  {
                    step: '03',
                    icon: <Utensils size={20} />,
                    title: 'Cucina passo-passo',
                    desc: 'Segui la Modalità Cucina con timer integrato e valori nutrizionali.',
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="fc-card"
                    style={{
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          background: 'rgba(50,133,103,0.12)',
                          color: 'var(--fc-fresh)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {item.icon}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--fc-sage)', opacity: 0.6 }}>
                        PASSO {item.step}
                      </span>
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--fc-forest)' }}>
                      {item.title}
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--fc-sage)', lineHeight: 1.5 }}>
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── COLONNA DESTRA: Radar + Pro + Referral ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Freshness Radar */}
            {expiryItems.length > 0 && (
              <div className="fc-card" style={{ padding: '22px 20px' }}>
                <ExpirationTracker
                  items={expiryItems}
                  onFindRecipe={(ingredient) => {
                    setTags((prev) => (prev.includes(ingredient) ? prev : [ingredient, ...prev]));
                    document.getElementById('generate-recipe-btn')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                />
              </div>
            )}

            {/* Card Pro */}
            <div
              id="pricing"
              className="fc-card"
              style={{
                padding: '26px 24px',
                background: 'linear-gradient(135deg, #174C3C 0%, #24634D 100%)',
                border: 'none',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -30,
                  right: -30,
                  width: 130,
                  height: 130,
                  borderRadius: '50%',
                  background: 'rgba(217,233,163,0.10)',
                }}
              />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 11px',
                    borderRadius: 999,
                    background: 'rgba(217,233,163,0.2)',
                    marginBottom: 14,
                  }}
                >
                  <TrendingUp size={11} style={{ color: '#D9E9A3' }} />
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#D9E9A3', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                    Offerta Lancio
                  </span>
                </div>

                <h3 style={{ fontSize: 21, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: 8 }}>
                  Passa a FrigoChef Pro
                </h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 1.55, marginBottom: 18 }}>
                  Scansioni AI illimitate del frigo, piano alimentare settimanale completo, calcolo macro e account famiglia.
                </p>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 20 }}>
                  <span style={{ fontSize: 34, fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    5,99 €
                  </span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
                    / mese • disdici quando vuoi
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
                    padding: '14px 18px',
                    background: '#D9E9A3',
                    color: '#174C3C',
                    fontWeight: 800,
                    fontSize: 14,
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Attiva Prova Pro Ora →
                </button>
              </div>
            </div>

            {/* Referral */}
            <ReferralDashboard />
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer
        style={{
          borderTop: '1px solid var(--fc-border)',
          padding: '28px 20px 96px',
          background: 'var(--fc-surface)',
          marginTop: 'auto',
        }}
      >
        <div
          style={{
            maxWidth: 1160,
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--fc-forest)' }}>
              FrigoChef
            </span>
            <span style={{ fontSize: 12, color: 'var(--fc-sage)' }}>
              © 2026 · La tua cucina, più intelligente.
            </span>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy', 'Termini', 'Contatti'].map((link) => (
              <a
                key={link}
                href="#"
                style={{ fontSize: 12, color: 'var(--fc-sage)', fontWeight: 600, textDecoration: 'none' }}
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
