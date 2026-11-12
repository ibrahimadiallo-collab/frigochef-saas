'use client';

import { useState, KeyboardEvent, useRef, ChangeEvent } from 'react';
import { X, Camera, Loader2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FridgeInputProps {
  tags: string[];
  setTags: (tags: string[]) => void;
  onItemsAnalyzed?: (items: { name: string; daysRemaining: number }[]) => void;
}

const SUGGERIMENTI_RAPIDI = [
  'Uova',
  'Zucchine',
  'Pollo',
  'Pomodorini',
  'Pasta',
  'Patate',
  'Mozzarella',
  'Tonno',
];

export default function FridgeInput({ tags, setTags, onItemsAnalyzed }: FridgeInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addTag = (value: string) => {
    const val = value.trim().toLowerCase();
    if (val && !tags.includes(val)) {
      setTags([...tags, val]);
      setInputValue('');
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const res = await fetch('/api/vision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });
        const data = await res.json();
        if (data.items) {
          const names = data.items.map((i: { name: string }) => i.name.toLowerCase());
          const newTags = [...new Set([...tags, ...names])] as string[];
          setTags(newTags);
          if (onItemsAnalyzed) onItemsAnalyzed(data.items);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Errore analisi immagine:', err);
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const availableSuggestions = SUGGERIMENTI_RAPIDI.filter(
    (s) => !tags.includes(s.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <label className="fc-label">I tuoi ingredienti</label>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isAnalyzing}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--fc-fresh)',
            background: 'rgba(50,133,103,0.12)',
            border: '1px solid rgba(50,133,103,0.28)',
            borderRadius: 999,
            padding: '6px 14px',
            cursor: 'pointer',
            opacity: isAnalyzing ? 0.6 : 1,
          }}
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Analisi foto…
            </>
          ) : (
            <>
              <Camera size={13} />
              Scansiona il frigo con AI
            </>
          )}
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          capture="environment"
          className="hidden"
        />
      </div>

      {/* Area input + chip */}
      <div
        style={{
          minHeight: 110,
          padding: 12,
          background: 'var(--fc-surface-alt)',
          border: '1.5px solid var(--fc-border)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        {/* Chip aggiunti */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            <AnimatePresence>
              {tags.map((tag, i) => (
                <motion.span
                  key={tag}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.15 }}
                  className="fc-chip"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(i);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: 'rgba(50,133,103,0.18)',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--fc-fresh)',
                      flexShrink: 0,
                    }}
                    aria-label={`Rimuovi ${tag}`}
                  >
                    <X size={10} />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Riga di inserimento con pulsante "+" */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            id="ing-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scrivi un ingrediente (es. uova, zucchine)…"
            style={{
              flex: 1,
              minWidth: 0,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 14,
              color: 'var(--fc-charcoal)',
              padding: '6px 4px',
              fontFamily: 'var(--font-sans)',
            }}
          />
          {inputValue.trim() && (
            <button
              type="button"
              onClick={() => addTag(inputValue)}
              style={{
                padding: '6px 12px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--fc-btn-bg)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Plus size={14} /> Aggiungi
            </button>
          )}
        </div>
      </div>

      {/* Scelta rapida con 1 tocco (ottimizzato per smartphone) */}
      {availableSuggestions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fc-sage)' }}>
              Aggiungi con un tocco:
            </span>
            {tags.length > 0 && (
              <button
                type="button"
                onClick={() => setTags([])}
                style={{
                  fontSize: 11,
                  color: 'var(--fc-coral)',
                  fontWeight: 700,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Svuota tutto
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {availableSuggestions.slice(0, 6).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => addTag(item)}
                className="fc-quick-pill"
              >
                <Plus size={11} style={{ color: 'var(--fc-fresh)' }} />
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
