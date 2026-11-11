'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import FridgeInput from '@/components/FridgeInput';
import ExpirationTracker from '@/components/ExpirationTracker';
import { Refrigerator, Sparkles, Loader2, Leaf, Package, ArrowRight } from 'lucide-react';
import { authHeader } from '@/lib/supabase';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function FridgePage() {
  const [tags, setTags] = useState<string[]>([]);
  const [expiryItems, setExpiryItems] = useState<{ name: string; daysRemaining: number }[]>([]);
  const [isPantryLoading, setIsPantryLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

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

  /* ── Auto-salvataggio ── */
  useEffect(() => {
    if (isPantryLoading) return;
    const save = async () => {
      try {
        await fetch('/api/pantry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
          body: JSON.stringify({ ingredients: tags }),
        });
        setLastSaved(new Date());
      } catch (err) {
        console.error('Salvataggio fallito:', err);
      }
    };
    const id = setTimeout(save, 1000);
    return () => clearTimeout(id);
  }, [tags, isPantryLoading]);

  /* ── Categorie ingredienti ── */
  const categories = [
    { label: 'Verdure & Frutta', keywords: ['spinaci', 'carote', 'broccoli', 'mele', 'banane', 'pomodori', 'zucchine', 'patate', 'cipolla', 'aglio', 'peperoni', 'melanzane', 'insalata', 'lattuga'], emoji: '🥦' },
    { label: 'Proteine', keywords: ['pollo', 'manzo', 'uova', 'tonno', 'salmone', 'maiale', 'tofu', 'ceci', 'lenticchie', 'fagioli', 'merluzzo', 'gamberetti'], emoji: '🥩' },
    { label: 'Latticini', keywords: ['latte', 'formaggio', 'yogurt', 'burro', 'panna', 'mozzarella', 'ricotta', 'parmigiano', 'mascarpone'], emoji: '🧀' },
    { label: 'Pasta & Cereali', keywords: ['pasta', 'riso', 'pane', 'farina', 'farro', 'quinoa', 'avena', 'cous cous'], emoji: '🍝' },
    { label: 'Condimenti', keywords: ['olio', 'aceto', 'sale', 'pepe', 'basilico', 'origano', 'rosmarino', 'timo', 'prezzemolo', 'zafferano', 'curry', 'paprika'], emoji: '🫙' },
    { label: 'Altro', keywords: [], emoji: '📦' },
  ];

  const tagsByCategory = categories.map((cat) => {
    const matched = cat.keywords.length > 0
      ? tags.filter((t) => cat.keywords.some((k) => t.toLowerCase().includes(k)))
      : tags.filter((t) => !categories.slice(0, -1).some((c) => c.keywords.some((k) => t.toLowerCase().includes(k))));
    return { ...cat, items: matched };
  }).filter((cat) => cat.items.length > 0);

  const urgentItems = expiryItems.filter((i) => i.daysRemaining <= 2);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--fc-cream)' }}>
      <Navbar />

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 24px 80px', display: 'flex', flexDirection: 'column', gap: 36 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}
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
                <Refrigerator size={20} />
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--fc-forest)', letterSpacing: '-0.03em' }}>
                Il Mio Frigo
              </h1>
            </div>
            <p style={{ fontSize: 14, color: 'var(--fc-sage)', maxWidth: 460 }}>
              Gestisci la tua dispensa, monitora le scadenze e ottieni ricette basate su quello che hai già a casa.
            </p>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div
              style={{
                padding: '10px 16px',
                background: '#fff',
                border: '1px solid var(--fc-border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <Package size={15} style={{ color: 'var(--fc-fresh)' }} />
              <div>
                <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--fc-charcoal)', lineHeight: 1 }}>{tags.length}</p>
                <p style={{ fontSize: 11, color: 'var(--fc-sage)' }}>ingredienti</p>
              </div>
            </div>
            {urgentItems.length > 0 && (
              <div
                style={{
                  padding: '10px 16px',
                  background: 'rgba(233,139,112,0.1)',
                  border: '1px solid rgba(233,139,112,0.3)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <Leaf size={15} style={{ color: 'var(--fc-coral)' }} />
                <div>
                  <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--fc-coral)', lineHeight: 1 }}>{urgentItems.length}</p>
                  <p style={{ fontSize: 11, color: 'var(--fc-coral)', opacity: 0.7 }}>da usare presto</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Layout 2 colonne */}
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}
          className="max-md:grid-cols-1"
        >
          {/* Sinistra: Input + categorie */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Card aggiunta ingredienti */}
            <div className="fc-card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--fc-forest)', marginBottom: 16 }}>
                Aggiungi Ingredienti
              </h2>

              {isPantryLoading ? (
                <div style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 className="animate-spin" size={22} style={{ color: 'var(--fc-sage)' }} />
                </div>
              ) : (
                <FridgeInput
                  tags={tags}
                  setTags={setTags}
                  onItemsAnalyzed={(items) => setExpiryItems((prev) => [...prev, ...items])}
                />
              )}

              {lastSaved && (
                <p style={{ fontSize: 11, color: 'var(--fc-sage)', marginTop: 10, textAlign: 'right' }}>
                  Salvato automaticamente alle {lastSaved.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>

            {/* Vista per categoria */}
            {tagsByCategory.length > 0 && (
              <div className="fc-card" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--fc-forest)', marginBottom: 16 }}>
                  Dispensa per Categoria
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {tagsByCategory.map((cat) => (
                    <div key={cat.label}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 14 }}>{cat.emoji}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fc-sage)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                          {cat.label}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--fc-sage)', opacity: 0.6 }}>({cat.items.length})</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {cat.items.map((item) => (
                          <span key={item} className="fc-chip" style={{ fontSize: 12 }}>
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stato vuoto */}
            {tags.length === 0 && !isPantryLoading && (
              <div
                className="fc-card"
                style={{
                  padding: '32px',
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, rgba(23,76,60,0.03) 0%, rgba(217,233,163,0.08) 100%)',
                }}
              >
                <Refrigerator size={36} style={{ color: 'var(--fc-sage)', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: 'var(--fc-sage)', lineHeight: 1.6 }}>
                  La tua dispensa è vuota.<br />
                  Aggiungi ingredienti o fotografa il tuo frigo.
                </p>
              </div>
            )}
          </div>

          {/* Destra: Freshness Radar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {expiryItems.length > 0 ? (
              <div className="fc-card" style={{ padding: '24px' }}>
                <ExpirationTracker
                  items={expiryItems}
                  onFindRecipe={(ingredient) => {
                    setTags((prev) => (prev.includes(ingredient) ? prev : [ingredient, ...prev]));
                  }}
                />
              </div>
            ) : (
              <div
                className="fc-card"
                style={{
                  padding: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  background: 'linear-gradient(135deg, rgba(217,233,163,0.2) 0%, rgba(217,233,163,0.05) 100%)',
                  border: '1px solid rgba(217,233,163,0.6)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={16} style={{ color: 'var(--fc-forest)' }} />
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--fc-forest)' }}>
                    Freshness Radar
                  </h3>
                </div>
                <p style={{ fontSize: 13, color: 'var(--fc-sage)', lineHeight: 1.6 }}>
                  Fotografa il tuo frigo con la funzione <strong>Fotografa il frigo</strong> per attivare
                  il monitoraggio automatico delle scadenze.
                </p>
                <div
                  style={{
                    padding: '14px',
                    background: '#fff',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {['Spinaci — 2 giorni', 'Yogurt — 4 giorni', 'Pollo — 1 giorno'].map((ex) => (
                    <div key={ex} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fc-coral)', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: 'var(--fc-charcoal)' }}>{ex}</span>
                    </div>
                  ))}
                  <p style={{ fontSize: 11, color: 'var(--fc-sage)', fontStyle: 'italic', marginTop: 4 }}>
                    Esempio — attiva con una foto reale
                  </p>
                </div>
              </div>
            )}

            {/* CTA genera ricetta */}
            {tags.length >= 2 && (
              <Link href="/" style={{ textDecoration: 'none' }}>
                <div
                  className="fc-card fc-card-hover"
                  style={{
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    background: 'var(--fc-forest)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                      Pronto a cucinare?
                    </p>
                    <p style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>
                      Genera una Ricetta con i tuoi {tags.length} ingredienti
                    </p>
                  </div>
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', flexShrink: 0,
                    }}
                  >
                    <ArrowRight size={18} />
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
