'use client';

import { useState, KeyboardEvent, useRef, ChangeEvent } from 'react';
import { X, Camera, Loader2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FridgeInputProps {
  tags: string[];
  setTags: (tags: string[]) => void;
  onItemsAnalyzed?: (items: { name: string; daysRemaining: number }[]) => void;
}

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
          const names = data.items.map((i: { name: string }) => i.name);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label className="fc-label">I tuoi ingredienti</label>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isAnalyzing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--fc-fresh)',
            background: 'rgba(50,133,103,0.08)',
            border: '1px solid rgba(50,133,103,0.2)',
            borderRadius: 8,
            padding: '5px 12px',
            cursor: 'pointer',
            opacity: isAnalyzing ? 0.6 : 1,
          }}
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Analisi in corso…
            </>
          ) : (
            <>
              <Camera size={12} />
              Fotografa il frigo
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

      {/* Area ingredienti */}
      <div
        style={{
          minHeight: 130,
          padding: 14,
          background: '#fff',
          border: '1.5px solid var(--fc-border)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignContent: 'flex-start',
          cursor: 'text',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
        onClick={() => document.getElementById('ing-input')?.focus()}
        onFocusCapture={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = 'var(--fc-fresh)';
          el.style.boxShadow = '0 0 0 3px rgba(50,133,103,0.12)';
        }}
        onBlurCapture={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = 'var(--fc-border)';
          el.style.boxShadow = 'none';
        }}
      >
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
                onClick={(e) => { e.stopPropagation(); removeTag(i); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: 'rgba(50,133,103,0.15)',
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

        <input
          id="ing-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            tags.length === 0
              ? 'Es. pasta, uova, zucchine… premi Invio per aggiungere'
              : ''
          }
          style={{
            flex: 1,
            minWidth: 160,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 14,
            color: 'var(--fc-charcoal)',
            padding: '4px 2px',
            fontFamily: 'var(--font-sans)',
          }}
        />
      </div>

      {/* Footer hint */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingInline: 2 }}>
        <p style={{ fontSize: 12, color: 'var(--fc-sage)' }}>
          Scrivi un ingrediente e premi{' '}
          <kbd
            style={{
              background: '#fff',
              border: '1px solid var(--fc-border)',
              borderRadius: 5,
              padding: '1px 6px',
              fontSize: 11,
              fontFamily: 'var(--font-sans)',
              color: 'var(--fc-charcoal)',
            }}
          >
            Invio
          </kbd>
        </p>
        {tags.length > 0 && (
          <button
            onClick={() => setTags([])}
            style={{
              fontSize: 12,
              color: 'var(--fc-coral)',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Svuota tutto
          </button>
        )}
      </div>
    </div>
  );
}
