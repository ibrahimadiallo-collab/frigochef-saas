'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Check, Timer, Play, Pause, RotateCcw } from 'lucide-react';

interface CookModeProps {
  recipe: {
    nome: string;
    passaggi: string[];
  };
  onClose: () => void;
}

export default function CookMode({ recipe, onClose }: CookModeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [timerOpen, setTimerOpen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 min default
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const nextStep = () => {
    if (currentStep < recipe.passaggi.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleStepComplete = (index: number) => {
    setCompletedSteps((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const progress = ((currentStep + 1) / recipe.passaggi.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'var(--fc-cream)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '0 24px',
          height: 72,
          borderBottom: '1px solid var(--fc-border)',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={onClose}
            title="Chiudi Modalità Cucina"
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              border: '1px solid var(--fc-border)',
              background: 'var(--fc-cream)',
              color: 'var(--fc-charcoal)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
          <div>
            <p className="fc-label" style={{ color: 'var(--fc-fresh)', marginBottom: 2 }}>
              Modalità Cucina
            </p>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--fc-forest)' }}>
              {recipe.nome}
            </h2>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <p className="fc-label" style={{ marginBottom: 2 }}>Progresso</p>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--fc-forest)' }}>
              {Math.round(progress)}%
            </p>
          </div>
          <div
            style={{
              width: 120,
              height: 7,
              background: 'rgba(23,76,60,0.08)',
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <motion.div
              style={{ height: '100%', background: 'var(--fc-fresh)', borderRadius: 999 }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar passaggi (desktop) */}
        <aside
          className="hidden md:flex"
          style={{
            width: 280,
            borderRight: '1px solid var(--fc-border)',
            background: '#fff',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--fc-border)' }}>
            <span className="fc-label">Tutti i Passaggi ({recipe.passaggi.length})</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recipe.passaggi.map((stepText, i) => {
              const isCurrent = currentStep === i;
              const isDone = completedSteps.includes(i);
              return (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: isCurrent ? '1.5px solid var(--fc-fresh)' : '1.5px solid transparent',
                    background: isCurrent ? 'rgba(50,133,103,0.08)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 800,
                      background: isDone
                        ? 'var(--fc-fresh)'
                        : isCurrent
                        ? 'var(--fc-forest)'
                        : 'rgba(23,76,60,0.08)',
                      color: isDone || isCurrent ? '#fff' : 'var(--fc-charcoal)',
                    }}
                  >
                    {isDone ? <Check size={12} /> : i + 1}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? 'var(--fc-forest)' : 'var(--fc-charcoal)',
                      opacity: isCurrent ? 1 : 0.7,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Passaggio {i + 1}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Active Step Area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 24px',
              textAlign: 'center',
              maxWidth: 760,
              margin: '0 auto',
              width: '100%',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    padding: '6px 16px',
                    borderRadius: 999,
                    background: 'rgba(217,233,163,0.6)',
                    border: '1px solid var(--fc-lime)',
                    color: 'var(--fc-forest)',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Passaggio {currentStep + 1} di {recipe.passaggi.length}
                </span>

                <h3
                  style={{
                    fontSize: 'clamp(22px, 3.8vw, 38px)',
                    fontWeight: 800,
                    lineHeight: 1.3,
                    letterSpacing: '-0.02em',
                    color: 'var(--fc-forest)',
                  }}
                >
                  {recipe.passaggi[currentStep]}
                </h3>

                <button
                  onClick={() => toggleStepComplete(currentStep)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 700,
                    fontSize: 14,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    border: completedSteps.includes(currentStep)
                      ? '1.5px solid var(--fc-fresh)'
                      : '1.5px solid var(--fc-border)',
                    background: completedSteps.includes(currentStep) ? 'var(--fc-fresh)' : '#fff',
                    color: completedSteps.includes(currentStep) ? '#fff' : 'var(--fc-charcoal)',
                    transition: 'all 0.2s',
                  }}
                >
                  <Check size={16} />
                  {completedSteps.includes(currentStep) ? 'Completato' : 'Segna come completato'}
                </button>
              </motion.div>
            </AnimatePresence>

            {/* Interactive Timer Widget */}
            {timerOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="fc-card"
                style={{
                  marginTop: 28,
                  padding: '16px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <span style={{ fontSize: 24, fontWeight: 800, fontFamily: 'monospace', color: 'var(--fc-forest)' }}>
                  {formatTimer(timerSeconds)}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1, 5, 10].map((min) => (
                    <button
                      key={min}
                      onClick={() => {
                        setTimerRunning(false);
                        setTimerSeconds(min * 60);
                      }}
                      style={{
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 6,
                        border: '1px solid var(--fc-border)',
                        background: 'var(--fc-cream)',
                        color: 'var(--fc-charcoal)',
                        cursor: 'pointer',
                      }}
                    >
                      {min}m
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setTimerRunning(!timerRunning)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'var(--fc-fresh)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {timerRunning ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button
                  onClick={() => {
                    setTimerRunning(false);
                    setTimerSeconds(300);
                  }}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    border: '1px solid var(--fc-border)',
                    background: '#fff',
                    color: 'var(--fc-sage)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={14} />
                </button>
              </motion.div>
            )}
          </div>

          {/* Footer Controls */}
          <footer
            style={{
              padding: '18px 28px',
              borderTop: '1px solid var(--fc-border)',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="fc-btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: currentStep === 0 ? 0.35 : 1,
                pointerEvents: currentStep === 0 ? 'none' : 'auto',
              }}
            >
              <ChevronLeft size={16} /> Precedente
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {currentStep < recipe.passaggi.length - 1 ? (
                <button
                  onClick={nextStep}
                  className="fc-btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 28px', fontSize: 15 }}
                >
                  Prossimo Passaggio <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="fc-btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '14px 28px',
                    fontSize: 15,
                    background: 'var(--fc-fresh)',
                  }}
                >
                  Termina Ricetta <Check size={18} />
                </button>
              )}
            </div>

            <button
              onClick={() => setTimerOpen(!timerOpen)}
              className="fc-btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: timerOpen ? 'rgba(50,133,103,0.1)' : '#fff',
              }}
            >
              <Timer size={16} /> Timer
            </button>
          </footer>
        </main>
      </div>
    </motion.div>
  );
}
