'use client';

import { useRef, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { Download, X, Sparkles, Share2, Link as LinkIcon, Check } from 'lucide-react';
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
  const [previewScale, setPreviewScale] = useState(0.3);

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
    // Short delay to ensure DOM is ready
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
      console.error('Export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  const copyRecipeLink = () => {
    if (!recipe.id) return;
    const url = `${window.location.origin}/recipe/${recipe.id}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative z-10 w-full max-w-4xl bg-white/[0.02] border border-white/10 rounded-[40px] overflow-hidden flex flex-col md:flex-row shadow-2xl"
          >
            {/* Preview Section */}
            <div className="flex-1 p-8 md:p-12 border-b md:border-b-0 md:border-r border-white/10 flex flex-col items-center justify-center bg-black/40">
              <div 
                ref={previewContainerRef}
                className="relative w-full aspect-[9/16] max-h-[60vh] md:max-h-[70vh] shadow-2xl rounded-2xl overflow-hidden border border-white/10"
              >
                {/* The actual element to be captured (Hidden from viewport scaling, scaled for preview) */}
                <div 
                  ref={storyRef}
                  className="absolute inset-0 w-[1080px] h-[1920px] bg-neutral-950 text-white p-16 flex flex-col origin-top-left"
                  style={{ transform: `scale(${previewScale})` }}
                >
                  {/* Background Accents */}
                  <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-500/10 blur-[120px] rounded-full -mr-96 -mt-96" />
                  <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/5 blur-[100px] rounded-full -ml-48 -mb-48" />

                  <div className="relative z-10 h-full flex flex-col">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-16">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center">
                          <Sparkles className="text-black" size={32} />
                        </div>
                        <div>
                          <p className="text-3xl font-black tracking-tighter">FRIGO<span className="text-emerald-500">CHEF</span></p>
                          <p className="text-sm font-bold text-white/40 tracking-[0.3em] uppercase">AI Masterpiece</p>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col justify-center space-y-12">
                      <h1 className="text-8xl font-black leading-[0.9] tracking-tighter">
                        {recipe.nome}
                      </h1>

                      <div className="flex gap-8">
                        <div className="bg-white/5 border border-white/10 px-8 py-4 rounded-3xl">
                          <p className="text-xs font-bold text-white/20 uppercase tracking-widest mb-1">Time</p>
                          <p className="text-2xl font-bold">{recipe.tempo}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 px-8 py-4 rounded-3xl">
                          <p className="text-xs font-bold text-white/20 uppercase tracking-widest mb-1">Difficulty</p>
                          <p className="text-2xl font-bold">{recipe.difficolta}</p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <p className="text-xs font-bold text-emerald-500 uppercase tracking-[0.4em]">Ingredients</p>
                        <div className="grid grid-cols-1 gap-4">
                          {recipe.ingredienti.slice(0, 6).map((ing, i) => (
                            <div key={i} className="flex items-center gap-4 text-3xl font-medium text-white/80">
                              <div className="w-2 h-2 rounded-full bg-emerald-500" />
                              {ing}
                            </div>
                          ))}
                          {recipe.ingredienti.length > 6 && (
                            <p className="text-2xl font-bold text-white/20 pl-6">
                              + {recipe.ingredienti.length - 6} more
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer / Nutrition */}
                    {recipe.nutrizione && (
                      <div className="grid grid-cols-4 gap-6 p-10 bg-emerald-500/10 border border-emerald-500/20 rounded-[40px] mt-auto">
                        <div className="text-center">
                          <p className="text-4xl font-black text-white">{recipe.nutrizione.calorie}</p>
                          <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Kcal</p>
                        </div>
                        <div className="text-center">
                          <p className="text-4xl font-black text-emerald-500">{recipe.nutrizione.proteine}</p>
                          <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Protein</p>
                        </div>
                        <div className="text-center">
                          <p className="text-4xl font-black text-blue-400">{recipe.nutrizione.carboidrati}</p>
                          <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Carbs</p>
                        </div>
                        <div className="text-center">
                          <p className="text-4xl font-black text-amber-400">{recipe.nutrizione.grassi}</p>
                          <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Fats</p>
                        </div>
                      </div>
                    )}

                    <div className="mt-12 text-center">
                      <p className="text-xl font-bold text-white/20 tracking-widest uppercase">
                        Generate your own at <span className="text-emerald-500">frigochef.ai</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-6 text-sm text-white/40 font-medium">Instagram Story Preview (9:16)</p>
            </div>

            {/* Controls Section */}
            <div className="w-full md:w-80 p-8 md:p-12 flex flex-col justify-between">
              <div className="space-y-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-white">Social Share</h3>
                    <p className="text-sm text-white/40 mt-1">Ready to go viral?</p>
                  </div>
                  <button 
                    onClick={onClose}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors"
                  >
                    <X className="text-white/40" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="flex items-center gap-3 text-emerald-500 mb-2">
                      <Sparkles size={16} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Instagram Story</span>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed">
                      Optimized for 1080x1920px. Perfect for Stories, Reels, and TikTok.
                    </p>
                  </div>

                  <button 
                    onClick={copyRecipeLink}
                    disabled={!recipe.id}
                    className="w-full p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between group hover:bg-emerald-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-emerald-500">
                        {isCopied ? <Check size={16} /> : <LinkIcon size={16} />}
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Public Link</p>
                        <p className="text-xs text-white/40">Copy for SEO sharing</p>
                      </div>
                    </div>
                    {isCopied && <span className="text-[10px] font-bold text-emerald-500 uppercase">COPIED</span>}
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-8">
                <button 
                  onClick={exportImage}
                  disabled={isExporting}
                  className="w-full h-16 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-emerald-400 transition-all disabled:opacity-50"
                >
                  {isExporting ? (
                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <Download size={20} />
                      DOWNLOAD IMAGE
                    </>
                  )}
                </button>
                <button 
                  disabled
                  className="w-full h-16 bg-white/5 text-white/20 border border-white/10 rounded-2xl font-bold flex items-center justify-center gap-3 cursor-not-allowed"
                >
                  <Share2 size={20} />
                  DIRECT SHARE (COMING)
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
