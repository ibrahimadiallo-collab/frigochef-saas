import { supabase } from './supabase';

export interface ShoppingItem {
  name: string;
  category: string;
  estimatedPrice?: number;
}

/**
 * Confronta gli ingredienti necessari con quelli in dispensa
 * e restituisce la lista delle mancanze.
 */
export async function generateSmartShoppingList(recipeIngredients: string[], userId: string) {
  // 1. Recupera la dispensa dell'utente
  const { data: pantryData } = await supabase
    .from('pantry')
    .select('ingredients')
    .eq('user_id', userId)
    .single();

  const pantryIngredients = (pantryData?.ingredients || []) as any[];
  const pantryNames = pantryIngredients.map(i => i.name.toLowerCase());

  // 2. Filtra cosa manca (logica semplice di matching stringhe)
  const missing = recipeIngredients.filter(needed => {
    const isPresent = pantryNames.some(p => needed.toLowerCase().includes(p) || p.includes(needed.toLowerCase()));
    return !isPresent;
  });

  return missing.map(name => ({
    name,
    category: 'General',
    status: 'pending'
  }));
}

/**
 * Simula l'invio della lista a un partner retail (es. Amazon Fresh)
 * Questa è la funzione che sblocca il business a 9 zeri.
 */
export async function checkoutToRetailer(items: ShoppingItem[], retailer: 'amazon' | 'carrefour' | 'instacart') {
  console.log(`Sending ${items.length} items to ${retailer} checkout...`);
  // Qui andrebbe l'integrazione con le API reali dei partner.
  return {
    success: true,
    checkoutUrl: `https://${retailer}.com/cart/add?items=${encodeURIComponent(JSON.stringify(items))}`,
    affiliateBonus: items.length * 0.50 // Esempio di revenue share
  };
}
