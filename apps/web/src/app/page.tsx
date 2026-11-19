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
  Refrigerator, Flame, TrendingUp, CheckCircle2, Camera, Utensils, Leaf, Check
} from 'lucide-react';
import { authHeader } from '@/lib/supabase';
import { Recipe, MealPlan } from '@/lib/ai';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const FILTRI_DIETA = ['Vegetariano', 'Vegano', 'Senza Glutine', 'Senza Lattosio'];

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
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPantryLoading, setIsPantryLoading] = useState(true);

  /* ── Caricamento dispensa isolata (localStorage per ospiti, Supabase per utenti autenticati) ── */
  useEffect(() => {
    const savedDiets = localStorage.getItem('fc_diet_prefs');
    const savedAllergens = localStorage.getItem('fc_allergens');
    if (savedDiets) {
      try { setDietaryPreferences(JSON.parse(savedDiets)); } catch { /* ignore */ }
    }
    if (savedAllergens) {
      try { setAllergens(JSON.parse(savedAllergens)); } catch { /* ignore */ }
    }

    async function loadPantry() {
      try {
        const localRaw = localStorage.getItem('fc_local_pantry');
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (Array.isArray(parsed)) setTags(parsed);
        }

        const headers = await authHeader();
        if (headers.Authorization) {
          const res = await fetch('/api/pantry', { headers });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.ingredients) && data.ingredients.length > 0) {
              setTags(data.ingredients);
              localStorage.setItem('fc_local_pantry', JSON.stringify(data.ingredients));
            }
          }
        }
      } catch (err) {
        console.error('Impossibile caricare la dispensa:', err);
      } finally {
        setIsPantryLoading(false);
      }
    }
    loadPantry();
  }, []);

  /* ── Auto-salvataggio dispensa (isolato sul dispositivo + sync cloud se autenticato) ── */
  useEffect(() => {
    if (isPantryLoading) return;
    localStorage.setItem('fc_local_pantry', JSON.stringify(tags));

    const save = async () => {
      try {
        const headers = await authHeader();
        if (!headers.Authorization) return;
        await fetch('/api/pantry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ ingredients: tags }),
        });
      } catch {
        // salvato in localStorage
      }
    };
    const id = setTimeout(save, 800);
    return () => clearTimeout(id);
  }, [tags, isPantryLoading]);

  const toggleDietFilter = (diet: string) => {
    const next = dietaryPreferences.includes(diet)
      ? dietaryPreferences.filter((d) => d !== diet)
      : [...dietaryPreferences, diet];
    setDietaryPreferences(next);
    localStorage.setItem('fc_diet_prefs', JSON.stringify(next));
  };

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
      const headers = await authHeader();
      const res = await fetch('/api/recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          ingredients: tags.join(', '),
          mealType,
          time,
          dietaryPreferences,
          allergens,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Errore nella generazione');
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
      const headers = await authHeader();
      const res = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          ingredients: tags.join(', '),
          dietaryPreferences,
          allergens,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Impossibile generare il piano');
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
            HERO — Posizionamento Trasparente (Fase 3.1 & 8.1)
        ════════════════════════════════════ */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
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
              <Leaf size={13} style={{ color: 'var(--fc-fresh)' }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--fc-forest)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                FrigoChef — La Tua Cucina, Più Intelligente
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
              Organizza la dispensa, cucina ciò che hai e riduci gli sprechi.
            </h1>

            <p style={{ fontSize: 16, color: 'var(--fc-sage)', fontWeight: 500, maxWidth: 560, lineHeight: 1.55 }}>
              Fotografa il contenuto del frigorifero o seleziona gli ingredienti disponibili:
              FrigoChef crea ricette personalizzate, piani settimanali e liste della spesa intelligenti.
            </p>

            {/* Caratteristiche reali del prodotto */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, paddingTop: 4 }}>
              {[
                'Riconoscimento ingredienti da foto',
                'Filtri dietetici e allergeni personalizzabili',
                'Piano settimanale e lista della spesa inclusi',
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
                  label="in scadenza"
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
                <Link
                  href="/profile"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: 'rgba(50,133,103,0.12)',
                    color: 'var(--fc-fresh)',
                    textDecoration: 'none',
                  }}
                >
                  {allergens.length > 0 ? `${allergens.length} allergeni esclusi` : 'Configura allergeni →'}
                </Link>
              </div>

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

              {/* Filtri dietetici rapidi (Fase 3.4) */}
              <div style={{ marginTop: 14 }}>
                <span className="fc-label" style={{ marginBottom: 8, display: 'block' }}>
                  Filtri Alimentari
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {FILTRI_DIETA.map((diet) => {
                    const active = dietaryPreferences.includes(diet);
                    return (
                      <button
                        key={diet}
                        type="button"
                        onClick={() => toggleDietFilter(diet)}
                        className="fc-quick-pill"
                        style={{
                          background: active ? 'var(--fc-btn-bg)' : 'var(--fc-surface-alt)',
                          color: active ? '#fff' : 'var(--fc-charcoal)',
                          borderColor: active ? 'var(--fc-btn-bg)' : 'var(--fc-border)',
                        }}
                      >
                        {active && <Check size={11} />}
                        <span>{diet}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selettori tipo pasto + tempo */}
              <div className="fc-select-grid" style={{ marginTop: 16 }}>
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
                    minHeight: 50,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontSize: 15,
                    lineHeight: 1,
                    opacity: isLoading ? 0.75 : 1,
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Lo Chef AI sta creando la ricetta…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>Genera Ricetta Ora</span>
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
                    minHeight: 50,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontSize: 14,
                    lineHeight: 1,
                    opacity: isPlanLoading ? 0.75 : 1,
                  }}
                >
                  {isPlanLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Pianificazione settimanale…</span>
                    </>
                  ) : (
                    <>
                      <Calendar size={16} />
                      <span>Genera Piano Pasti di 7 Giorni</span>
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

            {/* Sezione "Come funziona" + Suggerimento anti-spreco del giorno (Fase 3.1) */}
            {!recipe && !mealPlan && !isLoading && !isPlanLoading && (
              <>
                <div
                  className="fc-card"
                  style={{
                    padding: '18px 20px',
                    background: 'rgba(50,133,103,0.08)',
                    borderColor: 'rgba(50,133,103,0.25)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  <Leaf size={18} style={{ color: 'var(--fc-fresh)', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p className="fc-label" style={{ color: 'var(--fc-fresh)', marginBottom: 2 }}>
                      Suggerimento Anti-Spreco del Giorno
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--fc-charcoal)', lineHeight: 1.5 }}>
                      Disponi in prima fila nel frigorifero gli alimenti aperti o con scadenza ravvicinata e usa la funzione <strong>Scansiona il frigo con AI</strong> per creare ricette che li valorizzino per primi.
                    </p>
                  </div>
                </div>

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
                      title: 'Scansiona e verifica',
                      desc: 'Fotografa il frigo e conferma gli ingredienti riconosciuti prima di salvarli.',
                    },
                    {
                      step: '02',
                      icon: <Sparkles size={20} />,
                      title: 'Ricetta su misura',
                      desc: "L'AI combina i tuoi ingredienti rispettando diete e allergeni impostati.",
                    },
                    {
                      step: '03',
                      icon: <Utensils size={20} />,
                      title: 'Cucina e pianifica',
                      desc: 'Segui la Modalità Cucina con timer integrato o genera la lista della spesa.',
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
              </>
            )}
          </div>

          {/* ── COLONNA DESTRA: Radar + Piano Plus + Referral ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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

            {/* Card FrigoChef Plus (Fase 2.1 & 2.5: Mensile 5,99 € / Annuale 49,99 € + 7 giorni prova gratuita) */}
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
                    7 Giorni di Prova Gratuita
                  </span>
                </div>

                <h3 style={{ fontSize: 21, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: 8 }}>
                  FrigoChef Plus
                </h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.80)', lineHeight: 1.55, marginBottom: 14 }}>
                  50 ricette AI/giorno, 50 scansioni frigo/mese, 4 piani settimanali/mese e personalizzazione nutrizionale avanzata.
                </p>

                {/* Selettore Mensile / Annuale */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 6,
                    padding: 4,
                    borderRadius: 12,
                    background: 'rgba(0,0,0,0.22)',
                    marginBottom: 16,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    style={{
                      height: 32,
                      borderRadius: 8,
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: billingCycle === 'monthly' ? '#D9E9A3' : 'transparent',
                      color: billingCycle === 'monthly' ? '#174C3C' : '#fff',
                    }}
                  >
                    Mensile
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('annual')}
                    style={{
                      height: 32,
                      borderRadius: 8,
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: billingCycle === 'annual' ? '#D9E9A3' : 'transparent',
                      color: billingCycle === 'annual' ? '#174C3C' : '#fff',
                    }}
                  >
                    Annuale (-30%)
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 18 }}>
                  <span style={{ fontSize: 34, fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {billingCycle === 'annual' ? '49,99 €' : '5,99 €'}
                  </span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)' }}>
                    {billingCycle === 'annual' ? '/ anno (4,16 €/mese)' : '/ mese'}
                  </span>
                </div>

                <button
                  onClick={async () => {
                    const headers = await authHeader();
                    if (!headers.Authorization) {
                      document.getElementById('navbar-login-btn')?.click();
                      return;
                    }
                    const res = await fetch('/api/stripe/checkout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...headers },
                      body: JSON.stringify({ plan: billingCycle }),
                    });
                    const data = await res.json();
                    if (data.url) window.location.href = data.url;
                    else if (data.error) setError(data.error);
                  }}
                  style={{
                    width: '100%',
                    height: 48,
                    padding: '0 18px',
                    background: '#D9E9A3',
                    color: '#174C3C',
                    fontWeight: 800,
                    fontSize: 14,
                    lineHeight: 1,
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    cursor: 'pointer',
                  }}
                >
                  <span>Inizia 7 Giorni Gratis →</span>
                </button>

                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 10, textAlign: 'center' }}>
                  Rinnovo automatico · Disdici in qualsiasi momento dal{' '}
                  <Link href="/profile" style={{ color: '#D9E9A3', textDecoration: 'underline' }}>
                    Profilo
                  </Link>
                </p>
              </div>
            </div>

            <ReferralDashboard />
          </div>
        </div>
      </div>

      {/* ── FOOTER CON PAGINE LEGALI VERIFICATE (Fase 5.1 & 8.1) ── */}
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
            <Link href="/privacy" style={{ fontSize: 12, color: 'var(--fc-sage)', fontWeight: 600, textDecoration: 'none' }}>
              Privacy & Cookie
            </Link>
            <Link href="/terms" style={{ fontSize: 12, color: 'var(--fc-sage)', fontWeight: 600, textDecoration: 'none' }}>
              Termini e Condizioni
            </Link>
            <Link href="/contact" style={{ fontSize: 12, color: 'var(--fc-sage)', fontWeight: 600, textDecoration: 'none' }}>
              Assistenza & FAQ
            </Link>
            <Link href="/profile" style={{ fontSize: 12, color: 'var(--fc-sage)', fontWeight: 600, textDecoration: 'none' }}>
              Gestione Abbonamento & GDPR
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
