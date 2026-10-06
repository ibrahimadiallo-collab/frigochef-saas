'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Mic, MicOff, Pause, Play, RotateCcw, Timer, Volume2, X } from 'lucide-react';
import type { Recipe } from '@/types';
import { useTimer, formatClock } from '@/hooks/useTimer';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { EVENTS, trackEvent } from '@/lib/analytics';
import { speak, stopSpeaking, useSpeechSupport, useVoiceControl, type VoiceCommand } from '@/hooks/useVoiceControl';

interface CookModeProps {
  recipe: Recipe;
  onExit: () => void;
  onDone: () => void;
}

/** Modalità cucina a schermo intero: uno step alla volta, timer, checklist ingredienti. */
export default function CookMode({ recipe, onExit, onDone }: CookModeProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showIngredients, setShowIngredients] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const steps = recipe.steps;
  const step = steps[index];
  const isLast = index === steps.length - 1;
  const timer = useTimer((step?.duration ?? 0) * 60, () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.([200, 100, 200]);
  });

  useEffect(() => {
    trackEvent(EVENTS.COOK_MODE_STARTED, { recipeId: recipe.id, steps: steps.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe.id]);

  const speech = useSpeechSupport();
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  function handleVoiceCommand(cmd: VoiceCommand) {
    if (cmd === 'next' && !isLast) go(1);
    else if (cmd === 'previous' && index > 0) go(-1);
    else if (cmd === 'repeat' && step) speak(step.instruction);
    else if (cmd === 'timer' && step?.duration) timer.start();
    else if (cmd === 'done' && isLast) finish();
  }
  const voice = useVoiceControl(handleVoiceCommand, voiceEnabled);

  // In modalità voce legge automaticamente ogni nuovo step.
  useEffect(() => {
    if (voiceEnabled && step) speak(step.instruction);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, voiceEnabled]);

  useEffect(() => stopSpeaking, []);

  function finish() {
    trackEvent(EVENTS.COOK_MODE_COMPLETED, { recipeId: recipe.id, steps: steps.length });
    onDone();
  }

  // Navigazione da tastiera (frecce).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && !isLast) go(1);
      if (e.key === 'ArrowLeft' && index > 0) go(-1);
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function go(delta: number) {
    setDirection(delta);
    setIndex((i) => Math.min(steps.length - 1, Math.max(0, i + delta)));
  }

  function toggle(i: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  if (!step) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]">
      <header className="border-b border-white/5 px-4 pb-3 pt-4 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-emerald-400">Cook mode</p>
            <h1 className="truncate text-base font-semibold text-white sm:text-lg">{recipe.title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {speech.synthesis && (
              <button type="button" onClick={() => speak(step.instruction)} aria-label="Read step aloud" title="Read step" className="rounded-full p-2 text-white/60 hover:bg-white/5 hover:text-white">
                <Volume2 className="h-5 w-5" aria-hidden />
              </button>
            )}
            {speech.recognition && (
              <button
                type="button"
                onClick={() => setVoiceEnabled((v) => !v)}
                aria-pressed={voiceEnabled}
                aria-label={voiceEnabled ? 'Turn voice control off' : 'Turn voice control on'}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  voiceEnabled ? 'bg-emerald-500 text-black' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
                )}
              >
                {voiceEnabled ? <Mic className="h-4 w-4" aria-hidden /> : <MicOff className="h-4 w-4" aria-hidden />} Voice
              </button>
            )}
            <button type="button" onClick={onExit} aria-label="Exit cook mode" className="rounded-full p-2 text-white/60 hover:bg-white/5 hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        {voiceEnabled && (
          <div className="mx-auto mt-3 flex max-w-3xl flex-wrap items-center gap-2 text-xs" aria-live="polite">
            {voice.error ? (
              <span className="text-red-300">{voice.error}</span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 font-semibold text-emerald-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden /> {voice.isListening ? 'Listening...' : 'Starting...'}
              </span>
            )}
            <span className="text-white/45">Speak commands: Next, Back, Repeat, Timer, Done</span>
          </div>
        )}
        <div className="mx-auto mt-3 max-w-3xl">
          <div className="mb-1 flex justify-between text-xs text-white/40">
            <span>Step {index + 1} of {steps.length}</span>
            <span>{Math.round(((index + 1) / steps.length) * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-emerald-500"
              initial={false}
              animate={{ width: `${((index + 1) / steps.length) * 100}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <section className="rounded-2xl border border-white/10 bg-gray-900/60">
            <button
              type="button"
              onClick={() => setShowIngredients((s) => !s)}
              aria-expanded={showIngredients}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-white/80"
            >
              Ingredients ({checked.size}/{recipe.ingredients.length} ready)
              <ChevronDown className={cn('h-4 w-4 transition-transform', showIngredients && 'rotate-180')} aria-hidden />
            </button>
            <AnimatePresence initial={false}>
              {showIngredients && (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden px-2 pb-2"
                >
                  {recipe.ingredients.map((ing, i) => (
                    <li key={`${ing.name}-${i}`}>
                      <button
                        type="button"
                        onClick={() => toggle(i)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-white/5"
                      >
                        <span
                          className={cn(
                            'flex h-5 w-5 items-center justify-center rounded-md border',
                            checked.has(i) ? 'border-emerald-500 bg-emerald-500 text-black' : 'border-white/20',
                          )}
                        >
                          {checked.has(i) && <Check className="h-3.5 w-3.5" aria-hidden />}
                        </span>
                        <span className={cn('capitalize', checked.has(i) ? 'text-white/40 line-through' : 'text-white/85')}>
                          {ing.quantity ?? ''} {ing.unit ?? ''} {ing.name}
                        </span>
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </section>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={index}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-lg font-bold text-black">
                {index + 1}
              </span>
              <p className="text-2xl font-medium leading-relaxed text-white sm:text-3xl">{step.instruction}</p>
            </motion.div>
          </AnimatePresence>

          {step.duration ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
              <div className="flex items-center gap-2 text-sm text-emerald-300">
                <Timer className="h-4 w-4" aria-hidden /> {step.duration} min timer
              </div>
              <p className={cn('font-mono text-5xl font-bold tabular-nums', timer.isFinished ? 'text-emerald-300' : 'text-white')}>
                {timer.isFinished ? "Time's up!" : formatClock(timer.remaining)}
              </p>
              <div className="flex gap-3">
                {timer.isRunning ? (
                  <Button variant="secondary" onClick={timer.pause}><Pause className="h-4 w-4" aria-hidden /> Pause</Button>
                ) : (
                  <Button onClick={timer.start}><Play className="h-4 w-4" aria-hidden /> {timer.remaining < timer.total && !timer.isFinished ? 'Resume' : 'Start'}</Button>
                )}
                <Button variant="ghost" onClick={() => timer.reset()} aria-label="Reset timer"><RotateCcw className="h-4 w-4" aria-hidden /></Button>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      <footer className="border-t border-white/5 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-8">
        <div className="mx-auto flex max-w-3xl gap-3">
          <Button variant="secondary" size="lg" className="flex-1" onClick={() => go(-1)} disabled={index === 0}>
            <ChevronLeft className="h-5 w-5" aria-hidden /> Previous
          </Button>
          {isLast ? (
            <Button size="lg" className="flex-1" onClick={finish}>
              <Check className="h-5 w-5" aria-hidden /> Done
            </Button>
          ) : (
            <Button size="lg" className="flex-1" onClick={() => go(1)}>
              Next <ChevronRight className="h-5 w-5" aria-hidden />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
