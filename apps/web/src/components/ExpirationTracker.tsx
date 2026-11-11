'use client';

import { motion } from 'framer-motion';
import { Leaf, AlertTriangle, Calendar, ArrowRight, Clock } from 'lucide-react';

interface ExpiryItem {
  name: string;
  daysRemaining: number;
}

interface ExpirationTrackerProps {
  items: ExpiryItem[];
  onFindRecipe?: (ingredient: string) => void;
}

type Category = 'fresh' | 'soon' | 'check';

function getCategory(days: number): Category {
  if (days <= 2) return 'check';
  if (days <= 4) return 'soon';
  return 'fresh';
}

const categoryConfig = {
  fresh: {
    label: 'Fresco',
    bg: 'rgba(217,233,163,0.4)',
    border: 'rgba(217,233,163,0.9)',
    dot: '#5a8c2a',
    text: '#2d5a1b',
    icon: <Leaf size={15} />,
  },
  soon: {
    label: 'Usa Presto',
    bg: 'rgba(233,139,112,0.10)',
    border: 'rgba(233,139,112,0.3)',
    dot: '#E98B70',
    text: '#c0533a',
    icon: <Clock size={15} />,
  },
  check: {
    label: 'Controlla Scadenza',
    bg: 'rgba(233,139,112,0.18)',
    border: 'rgba(233,139,112,0.5)',
    dot: '#c0533a',
    text: '#a03520',
    icon: <AlertTriangle size={15} />,
  },
};

export default function ExpirationTracker({ items, onFindRecipe }: ExpirationTrackerProps) {
  if (items.length === 0) return null;

  const sorted = [...items].sort((a, b) => a.daysRemaining - b.daysRemaining);

  const groups: Record<Category, ExpiryItem[]> = {
    fresh: [],
    soon: [],
    check: [],
  };
  sorted.forEach((item) => groups[getCategory(item.daysRemaining)].push(item));

  const allColumns: { cat: Category; items: ExpiryItem[] }[] = [
    { cat: 'check', items: groups.check },
    { cat: 'soon', items: groups.soon },
    { cat: 'fresh', items: groups.fresh },
  ];
  const columns = allColumns.filter((col) => col.items.length > 0);

  return (
    <div className="fc-animate-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'rgba(23,76,60,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--fc-forest)',
            }}
          >
            <Calendar size={16} />
          </div>
          <div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: 'var(--fc-forest)',
                letterSpacing: '-0.02em',
              }}
            >
              Freshness Radar
            </h3>
            <p style={{ fontSize: 12, color: 'var(--fc-sage)', marginTop: 1 }}>
              Stime AI sulla freschezza degli ingredienti
            </p>
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--fc-fresh)',
            background: 'rgba(50,133,103,0.08)',
            border: '1px solid rgba(50,133,103,0.2)',
            borderRadius: 999,
            padding: '3px 10px',
          }}
        >
          {items.length} ingredienti monitorati
        </span>
      </div>

      {/* Colonne per categoria */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(columns.length, 3)}, 1fr)`,
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
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {/* Intestazione colonna */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ color: cfg.text }}>{cfg.icon}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: cfg.text,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                  }}
                >
                  {cfg.label}
                </span>
              </div>

              {/* Schede ingredienti */}
              {colItems.map((item, i) => (
                <motion.div
                  key={`${item.name}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  style={{
                    background: '#fff',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    boxShadow: '0 1px 4px rgba(23,76,60,0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      {/* Dot status */}
                      <span
                        className="fc-pulse-dot"
                        style={{
                          display: 'block',
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: cfg.dot,
                          flexShrink: 0,
                          animationPlayState: cat === 'check' ? 'running' : 'paused',
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
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: cfg.text,
                      }}
                    >
                      {item.daysRemaining === 0
                        ? 'Oggi'
                        : item.daysRemaining === 1
                        ? 'Domani'
                        : `${item.daysRemaining} giorni`}
                    </span>
                  </div>

                  {/* Barra freschezza */}
                  <div
                    style={{
                      height: 3,
                      background: 'rgba(23,76,60,0.08)',
                      borderRadius: 999,
                      overflow: 'hidden',
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(8, 100 - item.daysRemaining * 10)}%` }}
                      transition={{ delay: i * 0.07 + 0.2, duration: 0.5 }}
                      style={{ height: '100%', background: cfg.dot, borderRadius: 999 }}
                    />
                  </div>

                  {/* CTA solo per urgenti e "usa presto" */}
                  {(cat === 'check' || cat === 'soon') && onFindRecipe && (
                    <button
                      onClick={() => onFindRecipe(item.name)}
                      style={{
                        display: 'flex',
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
                      Trova una ricetta
                      <ArrowRight size={10} />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Suggerimento contestuale */}
      {groups.check.length > 0 && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(233,139,112,0.08)',
            border: '1px solid rgba(233,139,112,0.25)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <AlertTriangle size={15} style={{ color: 'var(--fc-coral)', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: '#a03520', lineHeight: 1.5 }}>
            <strong>{groups.check[0].name}</strong> è il tuo ingrediente più urgente. Usalo oggi in una
            ricetta express per evitare sprechi.
          </p>
        </div>
      )}
    </div>
  );
}
