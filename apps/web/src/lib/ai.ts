import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiKey = process.env.GEMINI_API_KEY;
const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

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
  passaggi: string[];
}

export interface DayPlan {
  giorno: string;
  colazione: { nome: string; tempo: string; calorie: number };
  pranzo: { nome: string; tempo: string; calorie: number };
  cena: { nome: string; tempo: string; calorie: number };
}

export type MealPlan = DayPlan[];

export async function generateRecipe(ingredients: string, mealType: string, time: string): Promise<Recipe> {
  if (!genAI) throw new Error("GEMINI_API_KEY non configurata.");
  
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

  const prompt = `Sei uno chef italiano esperto e nutrizionista. L'utente ha questi ingredienti: ${ingredients}.
Crea UNA ricetta per ${mealType}, tempo: ${time}.
Calcola accuratamente calorie e macro-nutrienti (proteine, carboidrati, grassi).

Rispondi SOLO con JSON valido, senza markdown, senza backticks:
{
  "nome": "Nome del piatto",
  "tempo": "X minuti",
  "porzioni": "X persone",
  "difficolta": "Facile",
  "nutrizione": {
    "calorie": 0,
    "proteine": "0g",
    "carboidrati": "0g",
    "grassi": "0g"
  },
  "sostenibilita": 0,
  "ingredienti": ["quantità ingrediente", ...],
  "passaggi": ["Passo dettagliato 1", ...]
}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return {
      nome: parsed.nome || 'Ricetta AI',
      tempo: parsed.tempo || '20 min',
      porzioni: parsed.porzioni || '2 persone',
      difficolta: parsed.difficolta || 'Media',
      nutrizione: parsed.nutrizione || { calorie: 0, proteine: '0g', carboidrati: '0g', grassi: '0g' },
      sostenibilita: parsed.sostenibilita || 50,
      ingredienti: Array.isArray(parsed.ingredienti) ? parsed.ingredienti : [],
      passaggi: Array.isArray(parsed.passaggi) ? parsed.passaggi : []
    };
  } catch (err) {
    console.error("Gemini Parsing Error:", text);
    throw new Error("L'IA ha generato un formato non valido. Riprova.");
  }
}

export async function generateMealPlan(ingredients: string): Promise<MealPlan> {
  if (!genAI) throw new Error("GEMINI_API_KEY non configurata.");

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

  const prompt = `Sei uno chef e nutrizionista. L'utente ha questi ingredienti in dispensa: ${ingredients}.
Crea un piano alimentare di 7 giorni (Lunedì-Domenica) bilanciato e sostenibile.
Rispondi SOLO con un array JSON di 7 oggetti, senza markdown.
Ogni oggetto deve avere:
{
  "giorno": "Lunedì",
  "colazione": { "nome": "...", "tempo": "...", "calorie": 0 },
  "pranzo": { "nome": "...", "tempo": "...", "calorie": 0 },
  "cena": { "nome": "...", "tempo": "...", "calorie": 0 }
}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error("Gemini Meal Plan Error:", text);
    throw new Error("Errore durante la generazione del piano alimentare.");
  }
}
