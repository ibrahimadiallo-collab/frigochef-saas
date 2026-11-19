'use client';

import { useState, KeyboardEvent, useRef, ChangeEvent } from 'react';
import { X, Camera, Loader2, Plus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnalyzedItem {
  name: string;
  daysRemaining: number;
  category?: string;
}

interface FridgeInputProps {
  tags: string[];
  setTags: (tags: string[]) => void;
  onItemsAnalyzed?: (items: AnalyzedItem[]) => void;
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
  const [scanError, setScanError] = useState<string | null>(null);
  const [pendingScanItems, setPendingScanItems] = useState<AnalyzedItem[]>([]);
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

    setScanError(null);
    if (file.size > 5 * 1024 * 1024) {
      setScanError("L'immagine supera il limite massimo di 5 MB.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const res = await fetch('/api/vision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64 }),
          });
          const data = await res.json();
          if (!res.ok || data.error) {
            setScanError(data.error || "Errore durante l'analisi della foto.");
          } else if (Array.isArray(data.items) && data.items.length > 0) {
            // Fase 3.2: Mostra gli alimenti riconosciuti prima del salvataggio per conferma utente
            setPendingScanItems(data.items);
          } else {
            setScanError('Nessun alimento riconosciuto chiaramente nella foto.');
          }
        } catch {
          setScanError("Impossibile completare l'analisi dell'immagine.");
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setScanError("Errore nella lettura del file immagine.");
      setIsAnalyzing(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmScannedItems = () => {
    const names = pendingScanItems.map((i) => i.name.trim().toLowerCase()).filter(Boolean);
    const newTags = [...new Set([...tags, ...names])] as string[];
    setTags(newTags);
    if (onItemsAnalyzed) onItemsAnalyzed(pendingScanItems);
    setPendingScanItems([]);
  };

  const removePendingScanItem = (idx: number) => {
    setPendingScanItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updatePendingDays = (idx: number, days: number) => {
    setPendingScanItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, daysRemaining: days } : item))
    );
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
            justifyContent: 'center',
            gap: 6,
            height: 32,
            padding: '0 14px',
            fontSize: 12,
            fontWeight: 700,
            lineHeight: 1,
            color: 'var(--fc-fresh)',
            background: 'rgba(50,133,103,0.12)',
            border: '1px solid rgba(50,133,103,0.28)',
            borderRadius: 999,
            cursor: 'pointer',
            opacity: isAnalyzing ? 0.6 : 1,
          }}
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Analisi foto…</span>
            </>
          ) : (
            <>
              <Camera size={13} />
              <span>Scansiona il frigo con AI</span>
            </>
          )}
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
        />
      </div>

      {scanError && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(224,109,83,0.12)',
            border: '1px solid rgba(224,109,83,0.35)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--fc-coral)',
          }}
        >
          {scanError}
        </div>
      )}

      {/* Fase 3.2: Conferma & Correzione Alimenti Riconosciuti dall'AI prima del salvataggio */}
      {pendingScanItems.length > 0 && (
        <div
          style={{
            padding: 16,
            borderRadius: 'var(--radius-md)',
            background: 'rgba(50,133,103,0.08)',
            border: '1.5px solid var(--fc-fresh)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--fc-forest)' }}>
              Verifica gli alimenti riconosciuti dall&apos;AI ({pendingScanItems.length})
            </p>
            <p style={{ fontSize: 11, color: 'var(--fc-sage)' }}>
              Puoi rimuovere eventuali errori o correggere i giorni di scadenza stimati prima di aggiungerli alla dispensa.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pendingScanItems.map((item, idx) => (
              <div
                key={`${item.name}-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: 'var(--fc-surface)',
                  border: '1px solid var(--fc-border)',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fc-charcoal)', textTransform: 'capitalize' }}>
                  {item.name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 11, color: 'var(--fc-sage)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    Scadenza (gg):
                    <input
                      type="number"
                      min={0}
                      max={365}
                      value={item.daysRemaining}
                      onChange={(e) => updatePendingDays(idx, Number(e.target.value) || 0)}
                      style={{
                        width: 48,
                        height: 26,
                        padding: '0 6px',
                        borderRadius: 6,
                        border: '1px solid var(--fc-border)',
                        background: 'var(--fc-surface-alt)',
                        color: 'var(--fc-charcoal)',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removePendingScanItem(idx)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      border: 'none',
                      background: 'rgba(224,109,83,0.15)',
                      color: 'var(--fc-coral)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    title="Rimuovi"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={confirmScannedItems}
              className="fc-btn-primary"
              style={{ minHeight: 38, height: 38, padding: '0 16px', fontSize: 13, flex: 1 }}
            >
              <Check size={14} />
              <span>Conferma e Aggiungi alla Dispensa</span>
            </button>
            <button
              type="button"
              onClick={() => setPendingScanItems([])}
              className="fc-btn-secondary"
              style={{ minHeight: 38, height: 38, padding: '0 14px', fontSize: 12 }}
            >
              Annulla
            </button>
          </div>
        </div>
      )}

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
                height: 34,
                padding: '0 12px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--fc-btn-bg)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                lineHeight: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Plus size={14} />
              <span>Aggiungi</span>
            </button>
          )}
        </div>
      </div>

      {/* Scelta rapida con 1 tocco */}
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
                <span>{item}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
