import { z } from 'zod';
import { INGREDIENT_CATEGORIES, FRESHNESS_STATUSES, type IngredientCategory } from '@/types';

// ---------- Helpers ----------

const CATEGORY_ALIASES: Record<string, IngredientCategory> = {
  vegetables: 'vegetable', veggie: 'vegetable', produce: 'vegetable',
  fruits: 'fruit', meats: 'meat', poultry: 'meat', seafood: 'fish',
  cheese: 'dairy', milk: 'dairy', grains: 'grain', bread: 'grain', pasta: 'grain', cereal: 'grain',
  sauce: 'condiment', condiments: 'condiment', spice: 'condiment', spices: 'condiment',
  drink: 'beverage', drinks: 'beverage', beverages: 'beverage',
};

export function normalizeCategory(value: unknown): IngredientCategory {
  if (typeof value !== 'string') return 'other';
  const v = value.trim().toLowerCase();
  if ((INGREDIENT_CATEGORIES as readonly string[]).includes(v)) return v as IngredientCategory;
  return CATEGORY_ALIASES[v] ?? 'other';
}

/** Numero tollerante: accetta "200", "200g", null. */
const looseNumber = z.preprocess((v) => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}, z.number().nullable());

const looseString = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null),
  z.string().nullable(),
);

export const categorySchema = z.preprocess(normalizeCategory, z.enum(INGREDIENT_CATEGORIES));

// ---------- AI output: scan ----------

export const detectedIngredientSchema = z.object({
  name: z.string().trim().min(1).max(80).transform((s) => s.toLowerCase()),
  quantity: looseNumber.default(null),
  unit: looseString.default(null),
  category: categorySchema.default('other'),
  confidence: z.preprocess(
    (v) => (typeof v === 'number' ? Math.min(1, Math.max(0, v > 1 ? v / 100 : v)) : 0.7),
    z.number(),
  ),
});

export const scanResultSchema = z.object({
  ingredients: z.array(z.unknown()).default([]),
});

// ---------- Input API ----------

export const pantryItemInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  quantity: looseNumber.optional(),
  unit: z.string().trim().max(20).nullable().optional(),
  category: categorySchema.optional(),
  estimated_expiration: z.string().datetime({ offset: true }).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  source: z.enum(['scan', 'manual', 'import']).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const pantryItemUpdateSchema = pantryItemInputSchema.partial().extend({
  freshness_status: z.enum(FRESHNESS_STATUSES).optional(),
});

export const scanConfirmSchema = z.object({
  scanId: z.string().uuid().nullable().optional(),
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        quantity: looseNumber.optional(),
        unit: z.string().trim().max(20).nullable().optional(),
        category: categorySchema.optional(),
        confidence: z.number().min(0).max(1).optional(),
      }),
    )
    .min(1, 'Add at least one ingredient')
    .max(100),
});

export const recipeGenerateSchema = z.object({
  preferences: z.string().trim().max(300).optional(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'any']).optional(),
  servings: z.number().int().min(1).max(12).optional(),
});

export const recipeUpdateSchema = z.object({
  is_favorite: z.boolean().optional(),
  is_public: z.boolean().optional(),
});

// ---------- AI output: recipe ----------

export const aiRecipeSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(600).default(''),
  prepTime: looseNumber.transform((n) => Math.round(n ?? 10)),
  cookTime: looseNumber.transform((n) => Math.round(n ?? 20)),
  difficulty: z.preprocess(
    (v) => (typeof v === 'string' ? v.toLowerCase() : v),
    z.enum(['easy', 'medium', 'hard']).catch('easy'),
  ),
  servings: looseNumber.transform((n) => Math.max(1, Math.round(n ?? 2))),
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        quantity: looseNumber.default(null),
        unit: looseString.default(null),
        available: z.boolean().catch(false),
      }),
    )
    .min(1),
  steps: z
    .array(
      z.object({
        step: looseNumber.optional(),
        instruction: z.string().trim().min(1),
        duration: looseNumber.default(null),
      }),
    )
    .min(1)
    .transform((steps) => steps.map((s, i) => ({ step: i + 1, instruction: s.instruction, duration: s.duration }))),
  nutrition: z
    .object({
      calories: looseNumber.transform((n) => Math.round(n ?? 0)),
      protein: looseNumber.transform((n) => Math.round(n ?? 0)),
      carbs: looseNumber.transform((n) => Math.round(n ?? 0)),
      fat: looseNumber.transform((n) => Math.round(n ?? 0)),
    })
    .catch({ calories: 0, protein: 0, carbs: 0, fat: 0 }),
  usedPantryIngredients: z.array(z.string()).catch([]),
  missingIngredients: z.array(z.string()).catch([]),
  tags: z.array(z.string()).catch([]),
});
export type AiRecipe = z.infer<typeof aiRecipeSchema>;

// ---------- AI output: meal plan ----------

const mealSlotSchema = z.object({
  name: z.string().trim().min(1),
  time: z.preprocess((v) => (typeof v === 'number' ? `${v} min` : v), z.string().catch('30 min')),
  calories: looseNumber.transform((n) => Math.round(n ?? 0)),
});

export const mealPlanDaySchema = z.object({
  day: z.string().trim().min(1),
  breakfast: mealSlotSchema,
  lunch: mealSlotSchema,
  dinner: mealSlotSchema,
});

export const mealPlanSchema = z.array(mealPlanDaySchema).min(1).max(7);

/** Primo messaggio di errore leggibile da uno ZodError. */
export function firstZodMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Invalid request';
  const path = issue.path.length ? `${issue.path.join('.')}: ` : '';
  return `${path}${issue.message}`;
}
