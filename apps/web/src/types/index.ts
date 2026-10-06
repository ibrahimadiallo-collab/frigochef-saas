// Tipi di dominio condivisi tra client, API route e lib.

export const INGREDIENT_CATEGORIES = [
  'vegetable',
  'fruit',
  'meat',
  'fish',
  'dairy',
  'grain',
  'condiment',
  'beverage',
  'other',
] as const;
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export const FRESHNESS_STATUSES = ['fresh', 'soon', 'critical'] as const;
export type FreshnessStatus = (typeof FRESHNESS_STATUSES)[number];

export type PantrySource = 'scan' | 'manual' | 'import';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'any';
export type ScanStatus = 'pending' | 'confirmed' | 'failed';
export type AiProvider = 'gemini' | 'claude';

/** Riga di `pantry_items` (snake_case come nel DB). */
export interface PantryItem {
  id: string;
  user_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: IngredientCategory;
  added_at: string;
  estimated_expiration: string | null;
  freshness_status: FreshnessStatus;
  source: PantrySource;
  confidence: number;
  image_url: string | null;
  notes: string | null;
}

/** Ingrediente rilevato dall'AI (prima della conferma utente). */
export interface DetectedIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: IngredientCategory;
  confidence: number;
}

export interface ScanSession {
  id: string;
  user_id: string;
  image_url: string | null;
  raw_result: { ingredients: DetectedIngredient[]; provider?: AiProvider } | null;
  confirmed_ingredients: DetectedIngredient[] | null;
  status: ScanStatus;
  provider: AiProvider | null;
  created_at: string;
}

export interface RecipeIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  available: boolean;
}

export interface RecipeStep {
  step: number;
  instruction: string;
  /** Durata in minuti (se lo step ha un timer). */
  duration: number | null;
}

export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Ricetta normalizzata (camelCase) usata dalla UI. */
export interface Recipe {
  id: string;
  title: string;
  description: string;
  prepTime: number;
  cookTime: number;
  difficulty: Difficulty;
  servings: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  nutrition: Nutrition;
  usedPantryIngredients: string[];
  missingIngredients: string[];
  tags: string[];
  mealType: string | null;
  imageUrl: string | null;
  isFavorite: boolean;
  isPublic: boolean;
  createdAt: string;
}

/** Riga di `recipes` così come restituita da Supabase (include colonne legacy). */
export interface RecipeRow {
  id: string;
  user_id: string | null;
  title: string | null;
  description: string | null;
  prep_time: number | null;
  cook_time: number | null;
  difficulty: string | null;
  servings: number | null;
  ingredients: unknown;
  steps: unknown;
  nutrition: unknown;
  used_pantry_ingredients: string[] | null;
  missing_ingredients: string[] | null;
  tags: string[] | null;
  meal_type: string | null;
  image_url: string | null;
  is_favorite: boolean | null;
  is_public: boolean | null;
  recipe_data: unknown;
  slug: string | null;
  created_at: string;
}

export interface MealSlot {
  name: string;
  time: string;
  calories: number;
}

export interface MealPlanDay {
  day: string;
  breakfast: MealSlot;
  lunch: MealSlot;
  dinner: MealSlot;
}

export interface MealPlan {
  id: string;
  user_id: string;
  week_start: string;
  plan: { days: MealPlanDay[] };
  created_at: string;
}

export interface ShoppingItem {
  id: string;
  user_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: IngredientCategory;
  checked: boolean;
  recipe_id: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  referral_code: string | null;
  referred_by: string | null;
  is_pro: boolean;
  stripe_customer_id: string | null;
  created_at: string;
}

export interface FreshnessSummary {
  critical: number;
  soon: number;
  fresh: number;
  total: number;
}

/** Forma standard degli errori restituiti dalle API route. */
export interface ApiError {
  error: string;
}
