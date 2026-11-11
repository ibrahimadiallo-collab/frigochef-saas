'use client';

import { useState } from 'react';
import { Calendar, Clock, Flame, ChevronRight, Sparkles, Sun, Moon, Coffee } from 'lucide-react';
import { MealPlan } from '@/lib/ai';
import { motion, AnimatePresence } from 'framer-motion';

interface MealPlannerProps {
  plan: MealPlan;
}

const GIORNI_BREVE = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export default function MealPlanner({ plan }: MealPlannerProps) {
  const [activeDay, setActiveDay] = useState(0);

  const day = plan[activeDay];

  const pasti = [
    {
      tipo: 'Colazione',
      data: day.colazione,
      icon: <Coffee size={16} />,
      accent: '#c27d1a',
      bg: 'rgba(255, 200, 100, 0.12)',
      border: 'rgba(255, 200, 100, 0.35)',
    },
    {
      tipo: 'Pranzo',
      data: day.pranzo,
      icon: <Sun size={16} />,
      accent: 'var(--fc-fresh)',
      bg: 'rgba(50,133,103,0.08)',
      border: 'rgba(50,133,103,0.2)',
    },
    {
      tipo: 'Cena',
      data: day.cena,
      icon: <Moon size={16} />,
      accent: '#5b6fa8',
      bg: 'rgba(91,111,168,0.08)',
      border: 'rgba(91,111,168,0.2)',
    },
  ];

  const totaleCalorie = day.colazione.calorie + day.pranzo.calorie + day.cena.calorie;

  return (
    <div
      className="fc-card fc-animate-up"
      style={{ overflow: 'hidden' }}
    >
      {/* Header */}
      <div
        style={{
          padding: '24px 28px',
          borderBottom: '1px solid var(--fc-border)',
          background: 'linear-gradient(135deg, rgba(23,76,60,0.04) 0%, transparent 60%)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Calendar size={18} style={{ color: 'var(--fc-forest)' }} />
            <h3
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--fc-forest)',
                letterSpacing: '-0.02em',
              }}
            >
              Piano Pasti Settimanale
            </h3>
          </div>
          <p style={{ fontSize: 13, color: 'var(--fc-sage)' }}>
            Piano personalizzato basato sulla tua dispensa
          </p>
        </div>

        {/* Totale calorie giornaliero */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            background: 'rgba(23,76,60,0.06)',
            border: '1px solid var(--fc-border)',
            borderRadius: 999,
          }}
        >
          <Flame size={14} style={{ color: 'var(--fc-coral)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fc-charcoal)' }}>
            {totaleCalorie} kcal oggi
          </span>
        </div>
      </div>

      {/* Selettore giorni */}
      <div
        style={{
          padding: '14px 28px',
          borderBottom: '1px solid var(--fc-border)',
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
        }}
      >
        {plan.map((dayItem, i) => (
          <button
            key={i}
            onClick={() => setActiveDay(i)}
            style={{
              minWidth: 52,
              padding: '8px 10px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              border: activeDay === i ? '1.5px solid var(--fc-fresh)' : '1.5px solid transparent',
              background:
                activeDay === i ? 'rgba(50,133,103,0.1)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: activeDay === i ? 'var(--fc-fresh)' : 'var(--fc-sage)',
              }}
            >
              {GIORNI_BREVE[i]}
            </span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: activeDay === i ? 'var(--fc-forest)' : 'var(--fc-charcoal)',
              }}
            >
              {i + 10}
            </span>
          </button>
        ))}
      </div>

      {/* Pasti del giorno selezionato */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeDay}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          style={{
            padding: '20px 28px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 14,
          }}
        >
          {pasti.map((pasto, i) => (
            <div
              key={i}
              className="fc-card-hover"
              style={{
                background: pasto.bg,
                border: `1px solid ${pasto.border}`,
                borderRadius: 'var(--radius-md)',
                padding: '18px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                position: 'relative',
                cursor: 'pointer',
              }}
            >
              {/* Badge tipo pasto */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ color: pasto.accent }}>{pasto.icon}</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: pasto.accent,
                  }}
                >
                  {pasto.tipo}
                </span>
              </div>

              {/* Nome piatto */}
              <h4
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--fc-charcoal)',
                  lineHeight: 1.3,
                  letterSpacing: '-0.01em',
                }}
              >
                {pasto.data.nome}
              </h4>

              {/* Meta info */}
              <div style={{ display: 'flex', gap: 12, marginTop: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} style={{ color: 'var(--fc-sage)' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fc-sage)' }}>
                    {pasto.data.tempo}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Flame size={11} style={{ color: 'var(--fc-coral)' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fc-sage)' }}>
                    {pasto.data.calorie} kcal
                  </span>
                </div>
              </div>

              {/* Arrow hover */}
              <div
                className="fc-card-hover"
                style={{
                  position: 'absolute',
                  bottom: 14,
                  right: 14,
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: '#fff',
                  border: '1px solid var(--fc-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--fc-forest)',
                  opacity: 0.6,
                }}
              >
                <ChevronRight size={13} />
              </div>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Footer */}
      <div
        style={{
          padding: '14px 28px',
          borderTop: '1px solid var(--fc-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(23,76,60,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={13} style={{ color: 'var(--fc-lime)' }} />
          <span style={{ fontSize: 12, color: 'var(--fc-sage)', fontWeight: 600 }}>
            Piano generato con AI dalla tua dispensa
          </span>
        </div>
        <button
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--fc-fresh)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          Lista della spesa
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}
