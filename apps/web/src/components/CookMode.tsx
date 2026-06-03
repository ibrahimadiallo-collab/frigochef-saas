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

  // Prevent scrolling when open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

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
    setCompletedSteps(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const progress = ((currentStep + 1) / recipe.passaggi.length) * 100;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#020202] flex flex-col"
    >
      {/* Header */}
      <header className="px-6 h-20 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-500">Cooking Mode</p>
            <h2 className="text-sm font-bold tracking-tight text-white/80 line-clamp-1">{recipe.nome}</h2>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/20">Progress</p>
            <p className="text-sm font-mono font-bold">{Math.round(progress)}%</p>
          </div>
          <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden hidden md:block border border-white/5">
            <motion.div 
              className="h-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 50 }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Step Navigation (Sidebar on Desktop) */}
        <aside className="hidden md:flex w-80 border-r border-white/5 flex-col bg-white/[0.01]">
          <div className="p-6 border-b border-white/5">
            <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">Steps</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {recipe.passaggi.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`w-full text-left p-4 rounded-2xl transition-all flex items-center gap-4 ${
                  currentStep === i 
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                    : 'hover:bg-white/5 border border-transparent text-white/40'
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono border ${
                  currentStep === i ? 'border-emerald-500/40 bg-emerald-500/20' : 'border-white/10'
                }`}>
                  {completedSteps.includes(i) ? <Check size={12} /> : i + 1}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider">Step {i + 1}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Active Step Area */}
        <main className="flex-1 flex flex-col relative">
          <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-20 text-center max-w-4xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="space-y-12"
              >
                <div className="space-y-4">
                  <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold tracking-[0.3em] uppercase">
                    Step {currentStep + 1} of {recipe.passaggi.length}
                  </span>
                  <h3 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight text-white">
                    {recipe.passaggi[currentStep]}
                  </h3>
                </div>

                <div className="flex justify-center gap-4">
                  <button 
                    onClick={() => toggleStepComplete(currentStep)}
                    className={`h-16 px-8 rounded-2xl font-bold flex items-center gap-3 transition-all ${
                      completedSteps.includes(currentStep)
                        ? 'bg-emerald-500 text-black'
                        : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    {completedSteps.includes(currentStep) ? (
                      <><Check size={20} /> Completed</>
                    ) : (
                      'Mark as Complete'
                    )}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Mobile Step Progress Indicator */}
          <div className="md:hidden h-1 bg-white/5 mx-6 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
          </div>

          {/* Footer Controls */}
          <footer className="p-6 md:p-10 border-t border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between">
            <button 
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors disabled:opacity-0"
            >
              <ChevronLeft size={20} /> Previous
            </button>

            <div className="flex items-center gap-4">
              {currentStep < recipe.passaggi.length - 1 ? (
                <button 
                  onClick={nextStep}
                  className="bg-white text-black h-14 md:h-16 px-8 md:px-12 rounded-2xl font-bold flex items-center gap-3 hover:bg-emerald-500 transition-all hover:scale-[1.05] active:scale-[0.95] shadow-[0_10px_30px_rgba(16,185,129,0.2)]"
                >
                  Next Step <ChevronRight size={20} />
                </button>
              ) : (
                <button 
                  onClick={onClose}
                  className="bg-emerald-500 text-black h-14 md:h-16 px-12 rounded-2xl font-bold flex items-center gap-3 hover:bg-emerald-400 transition-all shadow-[0_10px_30px_rgba(16,185,129,0.3)]"
                >
                  Finish Cooking <Check size={20} />
                </button>
              )}
            </div>

            <button className="hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">
              <Timer size={18} /> Timer
            </button>
          </footer>
        </main>
      </div>
    </motion.div>
  );
}
