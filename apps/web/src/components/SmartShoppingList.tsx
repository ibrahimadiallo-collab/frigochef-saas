'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, ArrowRight, Plus, Trash2, ExternalLink, ShieldCheck } from 'lucide-react';
import { generateSmartShoppingList, checkoutToRetailer, ShoppingItem } from '@/lib/shopping';

interface SmartShoppingListProps {
  recipeIngredients: string[];
  userId: string;
}

export default function SmartShoppingList({ recipeIngredients, userId }: SmartShoppingListProps) {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadList() {
      const list = await generateSmartShoppingList(recipeIngredients, userId);
      setItems(list);
      setIsLoading(false);
    }
    loadList();
  }, [recipeIngredients, userId]);

  const handleCheckout = async (retailer: 'amazon' | 'carrefour' | 'instacart') => {
    const result = await checkoutToRetailer(items, retailer);
    if (result.success) {
      window.open(result.checkoutUrl, '_blank');
    }
  };

  if (isLoading) return <div className="p-8 text-white/20 animate-pulse text-center">Analizzando la tua dispensa...</div>;

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-[32px] overflow-hidden backdrop-blur-xl">
      <div className="p-8 border-b border-white/5 bg-gradient-to-r from-emerald-500/10 to-transparent flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingCart size={20} className="text-emerald-500" />
            Smart Shopping List
          </h3>
          <p className="text-xs text-white/40 mt-1">Abbiamo trovato {items.length} ingredienti mancanti per questa ricetta.</p>
        </div>
        <div className="bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest italic">Save Time & Money</span>
        </div>
      </div>

      <div className="p-8 space-y-4">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-emerald-500/30 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-emerald-500 transition-colors">
                <Plus size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-white/80">{item.name}</p>
                <p className="text-[10px] text-white/20 uppercase font-bold tracking-tighter">{item.category}</p>
              </div>
            </div>
            <button className="text-white/10 hover:text-red-400 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="text-emerald-500" size={32} />
            </div>
            <p className="text-white/60 font-bold">Hai già tutto! Sei un grande.</p>
          </div>
        )}

        <div className="pt-6 space-y-3">
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] text-center mb-4">Seleziona un partner per il checkout</p>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleCheckout('amazon')}
              className="flex items-center justify-center gap-2 p-4 bg-[#FF9900] text-black rounded-2xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Amazon Fresh <ExternalLink size={14} />
            </button>
            <button 
              onClick={() => handleCheckout('carrefour')}
              className="flex items-center justify-center gap-2 p-4 bg-white text-blue-900 rounded-2xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Carrefour <ExternalLink size={14} />
            </button>
          </div>
          <button 
            onClick={() => handleCheckout('instacart')}
            className="w-full flex items-center justify-center gap-2 p-4 border border-white/10 text-white rounded-2xl font-bold text-sm hover:bg-white/5 transition-all"
          >
            Altre opzioni di consegna <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
