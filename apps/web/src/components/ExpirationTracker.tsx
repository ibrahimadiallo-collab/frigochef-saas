'use client';

import { motion } from 'framer-motion';
import { Leaf, AlertTriangle, Calendar, ArrowRight, Clock, ShieldAlert } from 'lucide-react';

interface ExpiryItem {
  name: string;
  daysRemaining: number;
}

interface ExpirationTrackerProps {
  items: ExpiryItem[];
  onFindRecipe?: (ingredient: string) => void;
}

type Category = 'fresh' | 'soon' | 'expiring' | 'expired';

function getCategory(days: number): Category {
  if (days <= 0) return 'expired';
  if (days <= 2) return 'expiring';
  if (days <= 4) return 'soon';
  return 'fresh';
}

const categoryConfig: Record<
  Category,
  {
    label: string;
    bg: string;
    border: string;
    dot: string;
    text: string;
    icon: React.ReactNode;
  }
> = {
  fresh: {
    label: 'Freschi',
    bg: 'rgba(217,233,163,0.35)',
    border: 'rgba(217,233,163,0.85)',
    dot: '#4d7c22',
    text: '#2d5a1b',
    icon: <Leaf size={15} />,
  },
  soon: {
    label: 'Da consumare presto',
    bg: 'rgba(233,168,112,0.14)',
    border: 'rgba(233,168,112,0.38)',
    dot: '#d97706',
    text: '#b45309',
    icon: <Clock size={15} />,
  },
  expiring: {
    label: 'In scadenza',
    bg: 'rgba(224,109,83,0.15)',
    border: 'rgba(224,109,83,0.45)',
    dot: '#c0533a',
    text: '#a03520',
    icon: <AlertTriangle size={15} />,
  },
  expired: {
    label: 'Scaduti / Da verificare',
    bg: 'rgba(185,28,28,0.12)',
    border: 'rgba(185,28,28,0.35)',
    dot: '#b91c1c',
    text: '#991b1b',
    icon: <ShieldAlert size={15} />,
  },
};

export default function ExpirationTracker({ items, onFindRecipe }: ExpirationTrackerProps) {
  if (items.length === 0) return null;

  const sorted = [...items].sort((a, b) => a.daysRemaining - b.daysRemaining);

  const groups: Record<Category, ExpiryItem[]> = {
    fresh: [],
    soon: [],
    expiring: [],
    expired: [],
  };
  sorted.forEach((item) => groups[getCategory(item.daysRemaining)].push(item));

  const allColumns: { cat: Category; items: ExpiryItem[] }[] = [
    { cat: 'expired', items: groups.expired },
    { cat: 'expiring', items: groups.expiring },
    { cat: 'soon', items: groups.soon },
    { cat: 'fresh', items: groups.fresh },
  ];
  const columns = allColumns.filter((col) => col.items.length > 0);

  return (
    <div className="fc-animate-up" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'rgba(50,133,103,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--fc-fresh)',
            }}
          >
            <Calendar size={16} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--fc-forest)' }}>
              Freshness Radar
            </h3>
            <p style={{ fontSize: 12, color: 'var(--fc-sage)', marginTop: 1 }}>
              Monitoraggio scadenze in 4 livelli di priorità
            </p>
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--fc-fresh)',
            background: 'rgba(50,133,103,0.10)',
            border: '1px solid rgba(50,133,103,0.22)',
            borderRadius: 999,
            padding: '4px 10px',
          }}
        >
          {items.length} alimenti monitorati
        </span>
      </div>

      {/* Colonne per le 4 categorie */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
          gap: 12,
        }}
      >
        {columns.map(({ cat, items: colItems }) => {
          const cfg = categoryConfig[cat];
          return (
            <div
              key={cat}
              style={{
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                borderRadius: 'var(--radius-md)',
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: cfg.text }}>{cfg.icon}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: cfg.text,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {cfg.label} ({colItems.length})
                </span>
              </div>

              {colItems.map((item, i) => (
                <motion.div
                  key={`${item.name}-${i}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    background: 'var(--fc-surface)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    boxShadow: 'var(--fc-shadow-sm)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span
                        className="fc-pulse-dot"
                        style={{
                          display: 'block',
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: cfg.dot,
                          flexShrink: 0,
                          animationPlayState:
                            cat === 'expiring' || cat === 'expired' ? 'running' : 'paused',
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--fc-charcoal)',
                          textTransform: 'capitalize',
                        }}
                      >
                        {item.name}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: cfg.text }}>
                      {item.daysRemaining < 0
                        ? 'Scaduto'
                        : item.daysRemaining === 0
                        ? 'Scade oggi'
                        : item.daysRemaining === 1
                        ? '1 giorno'
                        : `${item.daysRemaining} giorni`}
                    </span>
                  </div>

                  {(cat === 'expiring' || cat === 'soon') && onFindRecipe && (
                    <button
                      type="button"
                      onClick={() => onFindRecipe(item.name)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--fc-fresh)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        textAlign: 'left',
                      }}
                    >
                      <span>Usa in una ricetta</span>
                      <ArrowRight size={11} />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Avvertenza obbligatoria di sicurezza alimentare (Fase 3.2) */}
      <div
        style={{
          padding: '10px 14px',
          background: 'var(--fc-surface-alt)',
          border: '1px solid var(--fc-border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 11,
          color: 'var(--fc-sage)',
          lineHeight: 1.45,
        }}
      >
        <strong>Nota sulla sicurezza alimentare:</strong> Le scadenze proposte dall&apos;AI sono stime indicative e non costituiscono una garanzia di sicurezza alimentare. Verifica sempre la data riportata sulla confezione e lo stato di conservazione reale dell&apos;alimento.
      </div>
    </div>
  );
}
