'use client';

import { useEffect, useRef, useState } from 'react';

export type VoiceCommand = 'next' | 'previous' | 'repeat' | 'timer' | 'done';

// Tipi minimi della Web Speech API (non inclusi in lib.dom di TypeScript).
interface SpeechRecognitionAlternativeLike { transcript: string }
interface SpeechRecognitionResultLike { readonly length: number; [index: number]: SpeechRecognitionAlternativeLike }
interface SpeechRecognitionEventLike { readonly results: { readonly length: number; [index: number]: SpeechRecognitionResultLike } }
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Riconosce il comando a partire dalla trascrizione (parole chiave in inglese). */
export function parseVoiceCommand(raw: string): VoiceCommand | null {
  const t = raw.toLowerCase().trim();
  if (/\b(next|forward|continue)\b/.test(t)) return 'next';
  if (/\b(back|previous|go back)\b/.test(t)) return 'previous';
  if (/\b(repeat|again|read)\b/.test(t)) return 'repeat';
  if (/\btimer\b/.test(t)) return 'timer';
  if (/\b(done|finish|finished)\b/.test(t)) return 'done';
  return null;
}

/** Feature detect (dopo il mount, per evitare mismatch di idratazione). */
export function useSpeechSupport() {
  const [support, setSupport] = useState({ recognition: false, synthesis: false });
  useEffect(() => {
    setSupport({ recognition: getRecognitionCtor() !== null, synthesis: 'speechSynthesis' in window });
  }, []);
  return support;
}

/** Ascolta comandi vocali finché `enabled` è true; riavvia il riconoscimento quando il browser lo chiude per silenzio. */
export function useVoiceControl(onCommand: (cmd: VoiceCommand) => void, enabled: boolean) {
  const handlerRef = useRef(onCommand);
  handlerRef.current = onCommand;
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!enabled || !Ctor) {
      setIsListening(false);
      return;
    }
    let active = true;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const cmd = last?.[0] ? parseVoiceCommand(last[0].transcript) : null;
      if (cmd) handlerRef.current(cmd);
    };
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        active = false;
        setError('Microphone access was denied.');
        setIsListening(false);
      }
    };
    recognition.onend = () => {
      if (!active) return;
      try {
        recognition.start();
      } catch {
        setIsListening(false);
      }
    };
    try {
      recognition.start();
      setError(null);
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
    return () => {
      active = false;
      recognition.onend = null;
      recognition.abort();
      setIsListening(false);
    };
  }, [enabled]);

  return { isListening, error };
}

/** Legge un testo ad alta voce (interrompe la lettura precedente). */
export function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}
