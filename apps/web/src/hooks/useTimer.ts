'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface TimerControls {
  /** Secondi rimanenti. */
  remaining: number;
  /** Durata totale in secondi. */
  total: number;
  isRunning: boolean;
  isFinished: boolean;
  /** Avanzamento 0–1. */
  progress: number;
  start: () => void;
  pause: () => void;
  reset: (seconds?: number) => void;
}

/** Countdown semplice con start/pause/reset; notifica `onFinish` allo scadere. */
export function useTimer(initialSeconds: number, onFinish?: () => void): TimerControls {
  const [total, setTotal] = useState(initialSeconds);
  const [remaining, setRemaining] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    setTotal(initialSeconds);
    setRemaining(initialSeconds);
    setIsRunning(false);
  }, [initialSeconds]);

  useEffect(() => {
    if (!isRunning) return;
    const id = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(id);
          setIsRunning(false);
          onFinishRef.current?.();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isRunning]);

  const start = useCallback(() => {
    setRemaining((r) => (r <= 0 ? total : r));
    setIsRunning(true);
  }, [total]);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(
    (seconds?: number) => {
      const next = seconds ?? total;
      setTotal(next);
      setRemaining(next);
      setIsRunning(false);
    },
    [total],
  );

  return {
    remaining,
    total,
    isRunning,
    isFinished: remaining === 0 && total > 0,
    progress: total > 0 ? 1 - remaining / total : 0,
    start,
    pause,
    reset,
  };
}

export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
