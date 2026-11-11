'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2, Check, Copy, ShieldCheck } from 'lucide-react';
import { generateSmartShoppingList, ShoppingItem } from '@/lib/shopping';

interface SmartShoppingListProps {
  recipeIngredients: string[];
  userId?: string;
  pantryIngredients?: string[];
}

export default function SmartShoppingList({
  recipeIngredients,
  userId,
  pantryIngredients,
}: SmartShoppingListProps) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newItemName, setNewItemName] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadList() {
      setIsLoading(true);
      const list = await generateSmartShoppingList(recipeIngredients, userId, pantryIngredients);
      setItems(list);
      setIsLoading(false);
    }
    loadList();
  }, [recipeIngredients, userId, pantryIngredients]);

  const toggleItem = (idx: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, checked: !item.checked } : item))
    );
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const addCustomItem = () => {
    const trimmed = newItemName.trim();
    if (!trimmed) return;
    setItems((prev) => [...prev, { name: trimmed, category: 'Aggiunto', checked: false }]);
    setNewItemName('');
  };

  const copyList = () => {
    const text =
      '🛒 Lista della Spesa — FrigoChef\n\n' +
      items.map((i) => `${i.checked ? '☑' : '☐'} ${i.name} (${i.category})`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="fc-card" style={{ padding: 24, textAlign: 'center', color: 'var(--fc-sage)', fontSize: 13 }}>
        Analisi della tua dispensa in corso…
      </div>
    );
  }

  return (
    <div className="fc-card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--fc-border)',
          background: 'linear-gradient(135deg, rgba(23,76,60,0.04) 0%, rgba(217,233,163,0.12) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--fc-forest)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingCart size={18} style={{ color: 'var(--fc-fresh)' }} />
            Lista della Spesa Intelligente
          </h3>
          <p style={{ fontSize: 12, color: 'var(--fc-sage)', marginTop: 2 }}>
            {items.length > 0
              ? `${items.filter((i) => !i.checked).length} prodotti da acquistare`
              : 'Hai già tutti gli ingredienti necessari in dispensa!'}
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={copyList}
            className="fc-btn-secondary"
            style={{ padding: '7px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {copied ? <Check size={14} style={{ color: 'var(--fc-fresh)' }} /> : <Copy size={14} />}
            {copied ? 'Copiata!' : 'Copia Lista'}
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Aggiungi prodotto manuale */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomItem()}
            placeholder="Aggiungi un prodotto alla lista…"
            className="fc-input"
            style={{ flex: 1, padding: '9px 14px', fontSize: 13 }}
          />
          <button
            onClick={addCustomItem}
            className="fc-btn-primary"
            style={{ padding: '9px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} /> Aggiungi
          </button>
        </div>

        {/* Elenco prodotti */}
        {items.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            {items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: item.checked ? 'rgba(50,133,103,0.05)' : 'var(--fc-cream)',
                  border: '1px solid var(--fc-border)',
                  opacity: item.checked ? 0.65 : 1,
                  transition: 'all 0.15s',
                }}
              >
                <div
                  onClick={() => toggleItem(i)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flex: 1 }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      border: item.checked ? 'none' : '1.5px solid var(--fc-sage)',
                      background: item.checked ? 'var(--fc-fresh)' : '#fff',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {item.checked && <Check size={13} />}
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--fc-charcoal)',
                        textDecoration: item.checked ? 'line-through' : 'none',
                      }}
                    >
                      {item.name}
                    </p>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--fc-sage)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {item.category}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeItem(i)}
                  title="Rimuovi"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--fc-sage)',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(50,133,103,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px',
                color: 'var(--fc-fresh)',
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--fc-forest)' }}>
              Hai già tutto il necessario!
            </p>
            <p style={{ fontSize: 12, color: 'var(--fc-sage)', marginTop: 2 }}>
              Nessun ingrediente mancante rispetto alla tua dispensa.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
