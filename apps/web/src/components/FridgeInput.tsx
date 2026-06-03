'use client';

import { useState, KeyboardEvent, useRef, ChangeEvent } from 'react';
import { X, Camera, Loader2 } from 'lucide-react';
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
          const names = data.items.map((i: any) => i.name);
          const newTags = [...new Set([...tags, ...names])];
          setTags(newTags);
          if (onItemsAnalyzed) onItemsAnalyzed(data.items);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Error analyzing image:", err);
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">
          Your Ingredients
        </label>
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isAnalyzing}
          className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-emerald-500 hover:text-emerald-400 transition-colors disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Camera size={12} />
              Snap Photo
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

      <div 
        className="min-h-[140px] p-4 bg-white/[0.03] border border-white/10 rounded-[20px] flex flex-wrap gap-2 content-start focus-within:border-emerald-500/50 transition-all cursor-text group shadow-inner" 
        onClick={() => document.getElementById('ing-input')?.focus()}
      >
        <AnimatePresence>
          {tags.map((tag, i) => (
            <motion.span
              key={tag}
              initial={{ opacity: 0, scale: 0.8, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 5 }}
              className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-emerald-500/20 transition-colors"
            >
              {tag}
              <button 
                onClick={(e) => { e.stopPropagation(); removeTag(i); }}
                className="hover:bg-white/10 rounded-lg p-0.5 transition-colors"
              >
                <X size={14} />
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
          placeholder={tags.length === 0 ? "What's in your fridge?" : ""}
          className="flex-1 min-w-[150px] bg-transparent outline-none text-sm py-1.5 text-white placeholder:text-white/10"
        />
      </div>

      <div className="flex justify-between items-center px-1">
        <p className="text-[10px] text-white/20 font-medium">
          Type and press <kbd className="bg-white/5 px-1.5 py-0.5 rounded border border-white/5 text-white/40">Enter</kbd>
        </p>
        <button 
          onClick={() => setTags([])}
          className="text-[10px] text-white/20 hover:text-red-400 transition-colors font-medium"
        >
          Clear All
        </button>
      </div>
    </div>
  );
}
