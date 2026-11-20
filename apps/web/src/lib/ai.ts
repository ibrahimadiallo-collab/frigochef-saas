import { GoogleGenAI } from "@google/genai";

const geminiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash';
const ai = geminiKey ? new GoogleGenAI({ apiKey: geminiKey }) : null;

export interface Recipe {
  id?: string;
  nome: string;
  tempo: string;
  porzioni: string;
  difficolta: string;
  nutrizione: {
    calorie: number;
    proteine: string;
    carboidrati: string;
    grassi: string;
  };
  sostenibilita: number;
  ingredienti: string[];
  ingredienti_mancanti?: string[];
  sostituzioni?: string[];
  allergeni_da_verificare?: string[];
  passaggi: string[];
}

export interface DayPlan {
  giorno: string;
  colazione: { nome: string; tempo: string; calorie: number };
  pranzo: { nome: string; tempo: string; calorie: number };
  cena: { nome: string; tempo: string; calorie: number };
}

export type MealPlan = DayPlan[];

function withTimeout<T>(promise: Promise<T>, ms = 25000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timeout della richiesta AI (25s). Riprova tra qualche istante."));
    }, ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function generateRecipe(
  ingredients: string,
  mealType: string,
  time: string,
  dietaryPreferences: string[] = [],
  allergens: string[] = []
): Promise<Recipe> {
  if (!ai) throw new Error("GEMINI_API_KEY non configurata.");

  const dietNote =
    dietaryPreferences.length > 0
      ? `\nRispetta rigorosamente queste preferenze alimentari: ${dietaryPreferences.join(', ')}.`
      : '';
  const allergenNote =
    allergens.length > 0
      ? `\nEVITA assolutamente questi allergeni dichiarati dall'utente: ${allergens.join(', ')}.`
      : '';

  const response = await withTimeout(
    ai.models.generateContent({
      model: geminiModel,
      contents: `Sei uno chef italiano esperto e nutrizionista. L'utente ha questi ingredienti: ${ingredients}.
Crea UNA ricetta per ${mealType}, tempo: ${time}.${dietNote}${allergenNote}
Stima calorie e macro-nutrienti (proteine, carboidrati, grassi), indica eventuali ingredienti base mancanti, possibili sostituzioni e gli allergeni potenzialmente presenti da verificare sull'etichetta.

Rispondi SOLO con JSON valido:
{
  "nome": "Nome del piatto",
  "tempo": "X minuti",
  "porzioni": "2 persone",
  "difficolta": "Facile",
  "nutrizione": {
    "calorie": 0,
    "proteine": "0g",
    "carboidrati": "0g",
    "grassi": "0g"
  },
  "sostenibilita": 85,
  "ingredienti": ["quantità ingrediente", ...],
  "ingredienti_mancanti": ["eventuale ingrediente extra", ...],
  "sostituzioni": ["Es. Usa ricotta al posto della panna", ...],
  "allergeni_da_verificare": ["Glutine", "Lattosio", ...],
  "passaggi": ["Passo dettagliato 1", ...]
}`,
    }),
    25000
  );

  const text = response.text || '';

  try {
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return {
      nome: parsed.nome || 'Ricetta AI',
      tempo: parsed.tempo || '20 min',
      porzioni: parsed.porzioni || '2 persone',
      difficolta: parsed.difficolta || 'Media',
      nutrizione: parsed.nutrizione || { calorie: 0, proteine: '0g', carboidrati: '0g', grassi: '0g' },
      sostenibilita: parsed.sostenibilita || 80,
      ingredienti: Array.isArray(parsed.ingredienti) ? parsed.ingredienti : [],
      ingredienti_mancanti: Array.isArray(parsed.ingredienti_mancanti) ? parsed.ingredienti_mancanti : [],
      sostituzioni: Array.isArray(parsed.sostituzioni) ? parsed.sostituzioni : [],
      allergeni_da_verificare: Array.isArray(parsed.allergeni_da_verificare)
        ? parsed.allergeni_da_verificare
        : [],
      passaggi: Array.isArray(parsed.passaggi) ? parsed.passaggi : [],
    };
  } catch {
    console.error("Gemini 2.0 Parsing Error:", text);
    throw new Error("L'IA ha generato un formato non valido. Riprova.");
  }
}

export async function generateMealPlan(
  ingredients: string,
  dietaryPreferences: string[] = [],
  allergens: string[] = []
): Promise<MealPlan> {
  if (!ai) throw new Error("GEMINI_API_KEY non configurata.");

  const dietNote =
    dietaryPreferences.length > 0 ? ` Preferenze: ${dietaryPreferences.join(', ')}.` : '';
  const allergenNote =
    allergens.length > 0 ? ` Escludi allergeni: ${allergens.join(', ')}.` : '';

  const response = await withTimeout(
    ai.models.generateContent({
      model: geminiModel,
      contents: `Sei uno chef e nutrizionista. L'utente ha questi ingredienti in dispensa: ${ingredients}.${dietNote}${allergenNote}
Crea un piano alimentare di 7 giorni (Lunedì-Domenica) bilanciato e anti-spreco.
Rispondi SOLO con un array JSON di 7 oggetti.
Ogni oggetto deve avere:
{
  "giorno": "Lunedì",
  "colazione": { "nome": "...", "tempo": "...", "calorie": 0 },
  "pranzo": { "nome": "...", "tempo": "...", "calorie": 0 },
  "cena": { "nome": "...", "tempo": "...", "calorie": 0 }
}`,
    }),
    25000
  );

  const text = response.text || '';

  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    console.error("Gemini 2.0 Meal Plan Error:", text);
    throw new Error("Errore durante la generazione del piano alimentare.");
  }
}
