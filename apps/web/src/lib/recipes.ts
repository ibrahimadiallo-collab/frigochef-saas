import type { Difficulty, Nutrition, Recipe, RecipeIngredient, RecipeRow, RecipeStep } from '@/types';

const FOOD_IMAGES = [
  'photo-1512621776951-a57141f2eefd',
  'photo-1504674900247-0877df9cc836',
  'photo-1546069901-ba9599a7e63c',
  'photo-1540189549336-e6e99c3679fe',
  'photo-1565299624946-b28f40a0ae38',
  'photo-1567620905732-2d1ec7ab7445',
  'photo-1490645935967-10de6ba17061',
  'photo-1473093295043-cdd812d0e601',
  'photo-1547592180-85f173990554',
  'photo-1555939594-58d7cb561ad1',
];

/** Immagine food deterministica (stesso id → stessa foto) da Unsplash. */
export function foodImageFor(seed: string, width = 800): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return `https://images.unsplash.com/${FOOD_IMAGES[hash % FOOD_IMAGES.length]}?auto=format&fit=crop&w=${width}&q=70`;
}

const SELECT_COLUMNS =
  'id, user_id, title, description, prep_time, cook_time, difficulty, servings, ingredients, steps, nutrition, used_pantry_ingredients, missing_ingredients, tags, meal_type, image_url, is_favorite, is_public, recipe_data, slug, created_at';
export const RECIPE_COLUMNS = SELECT_COLUMNS;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function toDifficulty(v: unknown): Difficulty {
  const s = typeof v === 'string' ? v.toLowerCase() : '';
  if (s === 'medium' || s === 'media') return 'medium';
  if (s === 'hard' || s === 'difficile') return 'hard';
  return 'easy';
}

function parseIngredients(v: unknown): RecipeIngredient[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((i): RecipeIngredient[] => {
    if (typeof i === 'string') return [{ name: i, quantity: null, unit: null, available: false }];
    if (isRecord(i) && typeof i.name === 'string') {
      return [{
        name: i.name,
        quantity: i.quantity === null || i.quantity === undefined ? null : toNumber(i.quantity),
        unit: typeof i.unit === 'string' ? i.unit : null,
        available: i.available === true,
      }];
    }
    return [];
  });
}

function parseSteps(v: unknown): RecipeStep[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((s, idx): RecipeStep[] => {
    if (typeof s === 'string') return [{ step: idx + 1, instruction: s, duration: null }];
    if (isRecord(s) && typeof s.instruction === 'string') {
      return [{
        step: idx + 1,
        instruction: s.instruction,
        duration: s.duration === null || s.duration === undefined ? null : toNumber(s.duration) || null,
      }];
    }
    return [];
  });
}

function parseNutrition(v: unknown): Nutrition {
  if (!isRecord(v)) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  return {
    calories: toNumber(v.calories ?? v.calorie),
    protein: toNumber(v.protein ?? v.proteine),
    carbs: toNumber(v.carbs ?? v.carboidrati),
    fat: toNumber(v.fat ?? v.grassi),
  };
}

/**
 * Converte una riga DB in `Recipe`. Supporta sia le colonne strutturate nuove
 * sia le ricette legacy salvate solo in `recipe_data` (chiavi in italiano).
 */
export function rowToRecipe(row: RecipeRow): Recipe {
  const legacy = isRecord(row.recipe_data) ? row.recipe_data : {};
  const ingredients = parseIngredients(
    Array.isArray(row.ingredients) && row.ingredients.length ? row.ingredients : legacy.ingredienti,
  );
  const steps = parseSteps(Array.isArray(row.steps) && row.steps.length ? row.steps : legacy.passaggi);
  const legacyTime = toNumber(legacy.tempo, 0);
  const nutritionSource = isRecord(row.nutrition) && Object.keys(row.nutrition).length ? row.nutrition : legacy.nutrizione;

  return {
    id: row.id,
    title: row.title ?? (typeof legacy.nome === 'string' ? legacy.nome : 'Untitled recipe'),
    description: row.description ?? '',
    prepTime: row.prep_time ?? (legacyTime ? Math.round(legacyTime / 3) : 10),
    cookTime: row.cook_time ?? (legacyTime ? legacyTime - Math.round(legacyTime / 3) : 20),
    difficulty: toDifficulty(row.difficulty ?? legacy.difficolta),
    servings: row.servings ?? (toNumber(legacy.porzioni, 2) || 2),
    ingredients,
    steps,
    nutrition: parseNutrition(nutritionSource),
    usedPantryIngredients: row.used_pantry_ingredients ?? [],
    missingIngredients: row.missing_ingredients ?? [],
    tags: row.tags ?? [],
    mealType: row.meal_type,
    imageUrl: row.image_url ?? foodImageFor(row.id),
    isFavorite: row.is_favorite ?? false,
    isPublic: row.is_public ?? false,
    createdAt: row.created_at,
  };
}

export function totalTime(recipe: Pick<Recipe, 'prepTime' | 'cookTime'>): number {
  return recipe.prepTime + recipe.cookTime;
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
