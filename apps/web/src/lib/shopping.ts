import { supabase } from './supabase';

export interface ShoppingItem {
  name: string;
  category: string;
  checked?: boolean;
}

function guessCategory(itemName: string): string {
  const lower = itemName.toLowerCase();
  if (['spinaci', 'carote', 'broccoli', 'pomodori', 'zucchine', 'cipolla', 'aglio', 'insalata', 'limone', 'patate'].some(k => lower.includes(k))) {
    return 'Ortofrutta';
  }
  if (['pollo', 'manzo', 'uova', 'tonno', 'salmone', 'pesce', 'prosciutto', 'tofu'].some(k => lower.includes(k))) {
    return 'Proteine';
  }
  if (['latte', 'formaggio', 'yogurt', 'burro', 'panna', 'mozzarella', 'parmigiano', 'ricotta'].some(k => lower.includes(k))) {
    return 'Latticini';
  }
  if (['pasta', 'riso', 'pane', 'farina', 'olio', 'sale', 'pepe'].some(k => lower.includes(k))) {
    return 'Dispensa';
  }
  return 'Generale';
}

/**
 * Confronta gli ingredienti necessari con quelli in dispensa
 * e restituisce la lista degli ingredienti da acquistare.
 */
export async function generateSmartShoppingList(
  recipeIngredients: string[],
  userId?: string,
  localPantry?: string[]
): Promise<ShoppingItem[]> {
  let pantryNames: string[] = (localPantry || []).map(i => i.toLowerCase());

  if (userId && pantryNames.length === 0) {
    try {
      const { data: pantryData } = await supabase
        .from('pantry')
        .select('ingredients')
        .eq('user_id', userId)
        .single();

      const raw = pantryData?.ingredients || [];
      pantryNames = raw.map((i: string | { name: string }) =>
        typeof i === 'string' ? i.toLowerCase() : i.name.toLowerCase()
      );
    } catch {
      // fallback a lista vuota
    }
  }

  const missing = recipeIngredients.filter(needed => {
    const neededLower = needed.toLowerCase();
    const isPresent = pantryNames.some(
      p => p.length > 1 && (neededLower.includes(p) || p.includes(neededLower))
    );
    return !isPresent;
  });

  // Rimuove duplicati
  const uniqueMissing = Array.from(new Set(missing));

  return uniqueMissing.map(name => ({
    name,
    category: guessCategory(name),
    checked: false,
  }));
}

export async function checkoutToRetailer(
  items: ShoppingItem[],
  retailer: 'amazon' | 'carrefour' | 'instacart'
) {
  return {
    success: true,
    checkoutUrl: `https://www.${retailer === 'carrefour' ? 'carrefour.it' : 'amazon.it'}/s?k=${encodeURIComponent(
      items.map(i => i.name).join(' ')
    )}`,
  };
}
