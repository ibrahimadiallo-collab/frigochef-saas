'use client';

import { useState } from 'react';
import {
  Clock, Users, BarChart, Copy, Share2, Sparkles, Play,
  Leaf, ChefHat, Check, Heart, ShoppingCart
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import CookMode from './CookMode';
import SocialShare from './SocialShare';
import SmartShoppingList from './SmartShoppingList';

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
  ingredienti_mancanti?: string[];
  sostituzioni?: string[];
  allergeni_da_verificare?: string[];
  passaggi: string[];
}

interface RecipeCardProps {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const [isCookModeOpen, setIsCookModeOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [showShopping, setShowShopping] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const copyToClipboard = () => {
    const text = `${recipe.nome}\n\nIngredienti:\n${recipe.ingredienti.join('\n')}\n\nProcedimento:\n${recipe.passaggi.join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const getSostenibilitaLabel = (score: number) => {
    if (score >= 75) return { label: 'Alta Sostenibilità', color: 'var(--fc-fresh)' };
    if (score >= 50) return { label: 'Media Sostenibilità', color: '#c27d1a' };
    return { label: 'Bassa Sostenibilità', color: 'var(--fc-coral)' };
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="fc-card"
        style={{ overflow: 'hidden' }}
      >
        {/* ── HEADER ── */}
        <div
          style={{
            padding: '32px 32px 28px',
            background: 'linear-gradient(135deg, rgba(23,76,60,0.05) 0%, rgba(217,233,163,0.08) 100%)',
            borderBottom: '1px solid var(--fc-border)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background decorativo */}
          <div
            style={{
              position: 'absolute',
              top: -20,
              right: -20,
              opacity: 0.06,
            }}
          >
            <ChefHat size={140} style={{ color: 'var(--fc-forest)' }} />
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Badge AI + Sostenibilità */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} style={{ color: 'var(--fc-fresh)' }} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--fc-fresh)',
                  }}
                >
                  Ricetta Generata dall&apos;AI
                </span>
              </div>

              {recipe.sostenibilita && (() => {
                const { label, color } = getSostenibilitaLabel(recipe.sostenibilita);
                return (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 12px',
                      borderRadius: 999,
                      border: `1px solid ${color}40`,
                      background: `${color}10`,
                    }}
                  >
                    <Leaf size={11} style={{ color }} />
                    <span style={{ fontSize: 10, fontWeight: 800, color, letterSpacing: '0.05em' }}>
                      {label} {recipe.sostenibilita}/100
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Nome ricetta */}
            <h2
              style={{
                fontSize: 'clamp(24px, 4vw, 36px)',
                fontWeight: 800,
                color: 'var(--fc-forest)',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                marginBottom: 20,
              }}
            >
              {recipe.nome}
            </h2>

            {/* Meta info */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              {[
                { icon: <Clock size={13} />, label: 'Tempo', value: recipe.tempo },
                { icon: <Users size={13} />, label: 'Porzioni', value: recipe.porzioni },
                { icon: <BarChart size={13} />, label: 'Difficoltà', value: recipe.difficolta },
              ].map(({ icon, label, value }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      color: 'var(--fc-sage)',
                    }}
                  >
                    {icon} {label}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fc-charcoal)' }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Valori nutrizionali */}
            {recipe.nutrizione && (
              <div
                className="fc-nutrition-grid"
                style={{
                  marginTop: 22,
                  padding: '16px',
                  background: 'var(--fc-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--fc-border)',
                }}
              >
                {[
                  { label: 'Kcal', value: recipe.nutrizione.calorie, color: 'var(--fc-charcoal)' },
                  { label: 'Proteine', value: recipe.nutrizione.proteine, color: 'var(--fc-fresh)' },
                  { label: 'Carboidrati', value: recipe.nutrizione.carboidrati, color: '#5b6fa8' },
                  { label: 'Grassi', value: recipe.nutrizione.grassi, color: '#c27d1a' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--fc-sage)', marginTop: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── CORPO: INGREDIENTI + PASSAGGI ── */}
        <div className="fc-recipe-grid">
          {/* Ingredienti */}
          <div
            className="fc-recipe-ingredients"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <h3 className="fc-label">Ingredienti</h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recipe.ingredienti.map((ing, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    fontSize: 14,
                    color: 'var(--fc-charcoal)',
                    fontWeight: 500,
                  }}
                >
                  <span
                    style={{
                      marginTop: 5,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--fc-lime)',
                      border: '1.5px solid var(--fc-fresh)',
                      flexShrink: 0,
                    }}
                  />
                  {ing}
                </li>
              ))}
            </ul>

            {/* Eventuali ingredienti mancanti o sostituzioni (Fase 3.4) */}
            {recipe.ingredienti_mancanti && recipe.ingredienti_mancanti.length > 0 && (
              <div style={{ paddingTop: 10, borderTop: '1px solid var(--fc-border)' }}>
                <p className="fc-label" style={{ color: 'var(--fc-coral)', marginBottom: 6 }}>
                  Ingredienti extra / mancanti
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {recipe.ingredienti_mancanti.map((m, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: 999,
                        background: 'rgba(224,109,83,0.12)',
                        color: 'var(--fc-coral)',
                      }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {recipe.sostituzioni && recipe.sostituzioni.length > 0 && (
              <div style={{ paddingTop: 8 }}>
                <p className="fc-label" style={{ marginBottom: 4 }}>Possibili Sostituzioni</p>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--fc-sage)', lineHeight: 1.5 }}>
                  {recipe.sostituzioni.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Allergeni da verificare (Fase 3.4) */}
            <div
              style={{
                marginTop: 'auto',
                padding: '10px 12px',
                borderRadius: 10,
                background: 'var(--fc-surface-alt)',
                border: '1px solid var(--fc-border)',
                fontSize: 11,
                color: 'var(--fc-sage)',
                lineHeight: 1.4,
              }}
            >
              <strong>Allergeni da verificare:</strong>{' '}
              {recipe.allergeni_da_verificare && recipe.allergeni_da_verificare.length > 0
                ? recipe.allergeni_da_verificare.join(', ')
                : 'Controlla sempre le etichette degli ingredienti utilizzati.'}
            </div>
          </div>

          {/* Procedimento (preview) + CTA */}
          <div style={{ padding: '28px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="fc-label">Procedimento</h3>
              <span style={{ fontSize: 11, color: 'var(--fc-sage)', fontWeight: 600 }}>
                {recipe.passaggi.length} passaggi
              </span>
            </div>

            <ol style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {recipe.passaggi.slice(0, 3).map((step, i) => (
                <li key={i} style={{ display: 'flex', gap: 14 }}>
                  <span
                    style={{
                      flexShrink: 0,
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: 'rgba(23,76,60,0.07)',
                      border: '1px solid var(--fc-border)',
                      fontSize: 11,
                      fontWeight: 800,
                      color: 'var(--fc-forest)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--fc-charcoal)', opacity: 0.75 }}>
                    {step}
                  </p>
                </li>
              ))}
              {recipe.passaggi.length > 3 && (
                <li style={{ paddingLeft: 42, fontSize: 12, color: 'var(--fc-sage)', fontWeight: 600 }}>
                  + altri {recipe.passaggi.length - 3} passaggi in Modalità Cucina
                </li>
              )}
            </ol>

            {/* CTA Cucina */}
            <button
              onClick={() => setIsCookModeOpen(true)}
              className="fc-btn-primary"
              style={{
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                width: '100%',
                minHeight: 50,
                height: 50,
                fontSize: 15,
              }}
            >
              <Play size={17} fill="currentColor" />
              <span>Inizia a Cucinare</span>
            </button>
          </div>
        </div>

        {/* ── FOOTER AZIONI ── */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--fc-border)',
            background: 'rgba(23,76,60,0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <button
              onClick={copyToClipboard}
              className="fc-btn-secondary"
              style={{
                minHeight: 38,
                height: 38,
                padding: '0 14px',
                borderRadius: 10,
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copiata!' : 'Copia'}</span>
            </button>
            <button
              onClick={() => setIsShareOpen(true)}
              className="fc-btn-secondary"
              style={{
                minHeight: 38,
                height: 38,
                padding: '0 14px',
                borderRadius: 10,
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Share2 size={14} />
              <span>Condividi</span>
            </button>
            <button
              onClick={() => setShowShopping(!showShopping)}
              className="fc-btn-secondary"
              style={{
                minHeight: 38,
                height: 38,
                padding: '0 14px',
                borderRadius: 10,
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: showShopping ? 'rgba(50,133,103,0.12)' : 'var(--fc-surface)',
              }}
            >
              <ShoppingCart size={14} />
              <span>Lista Spesa</span>
            </button>
          </div>

          <button
            onClick={handleSave}
            className="fc-btn-secondary"
            style={{
              minHeight: 38,
              height: 38,
              padding: '0 14px',
              borderRadius: 10,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 700,
              color: saved ? 'var(--fc-coral)' : 'var(--fc-fresh)',
              borderColor: saved ? 'rgba(224,109,83,0.35)' : 'var(--fc-border-md)',
              cursor: 'pointer',
            }}
          >
            <Heart size={14} fill={saved ? 'currentColor' : 'none'} />
            <span>{saved ? 'Salvata!' : 'Salva nel Ricettario'}</span>
          </button>
        </div>

        {/* Lista della spesa espandibile */}
        {showShopping && (
          <div style={{ padding: '20px 28px', borderTop: '1px solid var(--fc-border)', background: 'var(--fc-cream)' }}>
            <SmartShoppingList recipeIngredients={recipe.ingredienti} />
          </div>
        )}
      </motion.div>

      {/* Cook Mode */}
      <AnimatePresence>
        {isCookModeOpen && (
          <CookMode recipe={recipe} onClose={() => setIsCookModeOpen(false)} />
        )}
      </AnimatePresence>

      <SocialShare recipe={recipe} isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />
    </>
  );
}
