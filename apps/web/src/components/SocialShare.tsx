'use client';

import { useRef, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { Download, X, Sparkles, Link as LinkIcon, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Recipe {
  id?: string;
  nome: string;
  tempo: string;
  porzioni: string;
  difficolta: string;
  nutrizione?: {
    calorie: number;
    proteine: string;
    carboidrati: string;
    grassi: string;
  };
  ingredienti: string[];
}

interface SocialShareProps {
  recipe: Recipe;
  isOpen: boolean;
  onClose: () => void;
}

export default function SocialShare({ recipe, isOpen, onClose }: SocialShareProps) {
  const storyRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.28);

  useEffect(() => {
    if (!isOpen || !previewContainerRef.current) return;

    const updateScale = () => {
      const container = previewContainerRef.current;
      if (container) {
        const containerWidth = container.offsetWidth;
        setPreviewScale(containerWidth / 1080);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    const timer = setTimeout(updateScale, 100);

    return () => {
      window.removeEventListener('resize', updateScale);
      clearTimeout(timer);
    };
  }, [isOpen]);

  const exportImage = async () => {
    if (!storyRef.current) return;

    setIsExporting(true);
    try {
      const dataUrl = await toPng(storyRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        width: 1080,
        height: 1920,
      });

      const link = document.createElement('a');
      link.download = `frigochef-${recipe.nome.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Esportazione fallita', err);
    } finally {
      setIsExporting(false);
    }
  };

  const copyRecipeLink = () => {
    const url = recipe.id
      ? `${window.location.origin}/recipe/${recipe.id}`
      : window.location.origin;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(23,76,60,0.45)',
              backdropFilter: 'blur(8px)',
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            className="fc-card"
            style={{
              position: 'relative',
              zIndex: 10,
              width: '100%',
              maxWidth: 820,
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: '1fr 300px',
            }}
          >
            {/* Preview Section */}
            <div
              style={{
                padding: 32,
                borderRight: '1px solid var(--fc-border)',
                background: 'var(--fc-cream)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                ref={previewContainerRef}
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: 260,
                  aspectRatio: '9 / 16',
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-lg)',
                  border: '1px solid var(--fc-border)',
                }}
              >
                {/* Actual 1080x1920 Story Canvas */}
                <div
                  ref={storyRef}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: 1080,
                    height: 1920,
                    background: '#174C3C',
                    color: '#F7F6EF',
                    padding: 72,
                    display: 'flex',
                    flexDirection: 'column',
                    transformOrigin: 'top left',
                    transform: `scale(${previewScale})`,
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 64 }}>
                    <div
                      style={{
                        width: 68,
                        height: 68,
                        background: '#D9E9A3',
                        borderRadius: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#174C3C',
                      }}
                    >
                      <Sparkles size={34} />
                    </div>
                    <div>
                      <p style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.03em' }}>
                        FrigoChef
                      </p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: '#A8BDA5', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                        La Tua Cucina Intelligente
                      </p>
                    </div>
                  </div>

                  {/* Main Body */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 48 }}>
                    <h1 style={{ fontSize: 82, fontWeight: 900, lineHeight: 0.98, letterSpacing: '-0.03em', color: '#FFFFFF' }}>
                      {recipe.nome}
                    </h1>

                    <div style={{ display: 'flex', gap: 24 }}>
                      <div style={{ background: 'rgba(255,255,255,0.08)', padding: '20px 32px', borderRadius: 24 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#A8BDA5', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>
                          Tempo
                        </p>
                        <p style={{ fontSize: 28, fontWeight: 800 }}>{recipe.tempo}</p>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.08)', padding: '20px 32px', borderRadius: 24 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#A8BDA5', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>
                          Difficoltà
                        </p>
                        <p style={{ fontSize: 28, fontWeight: 800 }}>{recipe.difficolta}</p>
                      </div>
                    </div>

                    <div>
                      <p style={{ fontSize: 16, fontWeight: 800, color: '#D9E9A3', textTransform: 'uppercase', letterSpacing: '0.25em', marginBottom: 24 }}>
                        Ingredienti Principali
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {recipe.ingredienti.slice(0, 6).map((ing, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 30, fontWeight: 600 }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#D9E9A3' }} />
                            {ing}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer Nutrition */}
                  {recipe.nutrizione && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 20,
                        padding: 40,
                        background: 'rgba(217,233,163,0.12)',
                        border: '2px solid rgba(217,233,163,0.25)',
                        borderRadius: 36,
                        marginTop: 'auto',
                        textAlign: 'center',
                      }}
                    >
                      <div>
                        <p style={{ fontSize: 38, fontWeight: 900 }}>{recipe.nutrizione.calorie}</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#A8BDA5', textTransform: 'uppercase' }}>Kcal</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 38, fontWeight: 900, color: '#D9E9A3' }}>{recipe.nutrizione.proteine}</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#A8BDA5', textTransform: 'uppercase' }}>Proteine</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 38, fontWeight: 900 }}>{recipe.nutrizione.carboidrati}</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#A8BDA5', textTransform: 'uppercase' }}>Carbo</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 38, fontWeight: 900, color: '#E98B70' }}>{recipe.nutrizione.grassi}</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#A8BDA5', textTransform: 'uppercase' }}>Grassi</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <p style={{ marginTop: 12, fontSize: 12, color: 'var(--fc-sage)', fontWeight: 600 }}>
                Anteprima Storia Instagram (9:16)
              </p>
            </div>

            {/* Controls Section */}
            <div style={{ padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#fff' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--fc-forest)' }}>Condividi Ricetta</h3>
                    <p style={{ fontSize: 12, color: 'var(--fc-sage)', marginTop: 2 }}>Pronta per i tuoi social</p>
                  </div>
                  <button
                    onClick={onClose}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border: '1px solid var(--fc-border)',
                      background: 'var(--fc-cream)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={15} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div
                    style={{
                      padding: 14,
                      background: 'var(--fc-cream)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--fc-border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fc-fresh)', marginBottom: 4 }}>
                      <Sparkles size={14} />
                      <span className="fc-label" style={{ color: 'var(--fc-fresh)' }}>Formato Storia</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--fc-charcoal)', opacity: 0.75, lineHeight: 1.5 }}>
                      Ottimizzata in 1080×1920px per Instagram Stories, Reels e WhatsApp.
                    </p>
                  </div>

                  <button
                    onClick={copyRecipeLink}
                    className="fc-btn-secondary"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      {isCopied ? <Check size={15} style={{ color: 'var(--fc-fresh)' }} /> : <LinkIcon size={15} />}
                      {isCopied ? 'Link copiato!' : 'Copia Link Ricetta'}
                    </span>
                  </button>
                </div>
              </div>

              <button
                onClick={exportImage}
                disabled={isExporting}
                className="fc-btn-primary"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '14px',
                }}
              >
                <Download size={17} />
                {isExporting ? 'Generazione immagine…' : 'Scarica Immagine'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
