import type { ShoppingCategory, ShoppingItem } from '@/types';
import { SHOPPING_CATEGORIES } from '@/types';

export const SHOPPING_COLUMNS = 'id, user_id, name, quantity, unit, category, checked, recipe_id, created_at';

export const CATEGORY_META: Record<ShoppingCategory, { label: string; emoji: string }> = {
  vegetable: { label: 'Vegetables', emoji: '🥦' },
  fruit: { label: 'Fruit', emoji: '🍎' },
  meat: { label: 'Meat & Fish', emoji: '🥩' },
  dairy: { label: 'Dairy', emoji: '🧀' },
  grain: { label: 'Grains', emoji: '🌾' },
  condiment: { label: 'Pantry', emoji: '🫙' },
  beverage: { label: 'Beverages', emoji: '🥤' },
  other: { label: 'Other', emoji: '📦' },
};

/** Mappa le categorie del DB (che includono anche 'fish') sulle sezioni della lista. */
export function shoppingCategoryOf(category: string): ShoppingCategory {
  if (category === 'fish') return 'meat';
  return (SHOPPING_CATEGORIES as readonly string[]).includes(category) ? (category as ShoppingCategory) : 'other';
}

export function sortByCategory(items: ShoppingItem[]): ShoppingItem[] {
  return [...items].sort((a, b) => {
    const ca = SHOPPING_CATEGORIES.indexOf(shoppingCategoryOf(a.category));
    const cb = SHOPPING_CATEGORIES.indexOf(shoppingCategoryOf(b.category));
    return ca - cb || Number(a.checked) - Number(b.checked) || a.name.localeCompare(b.name);
  });
}

export function formatQuantity(item: Pick<ShoppingItem, 'quantity' | 'unit'>): string {
  if (item.quantity == null) return item.unit ?? '';
  return `${item.quantity}${item.unit ? ` ${item.unit}` : ''}`;
}

/** Testo semplice per condividere la lista. */
export function shoppingListToText(items: ShoppingItem[]): string {
  const lines = ['FrigoChef shopping list', ''];
  for (const cat of SHOPPING_CATEGORIES) {
    const group = items.filter((i) => shoppingCategoryOf(i.category) === cat && !i.checked);
    if (!group.length) continue;
    lines.push(`${CATEGORY_META[cat].emoji} ${CATEGORY_META[cat].label}`);
    for (const i of group) {
      const qty = formatQuantity(i);
      lines.push(`- ${i.name}${qty ? ` (${qty})` : ''}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}
