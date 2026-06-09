export interface Recipe {
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
  colazione: Partial<Recipe>;
  pranzo: Partial<Recipe>;
  cena: Partial<Recipe>;
}

export type MealPlan = DayPlan[];

export async function generateRecipe(ingredients: string, mealType: string, time: string): Promise<Recipe> {
  const prompt = `Sei uno chef italiano esperto e nutrizionista. L'utente ha questi ingredienti: ${ingredients}.
Crea UNA ricetta per ${mealType}, tempo: ${time}.
Calcola accuratamente calorie e macro-nutrienti (proteine, carboidrati, grassi).

Valuta l'impatto di sostenibilità (Sustainability Score 0-100) basandoti su:
- Riduzione sprechi (usa ingredienti a rischio scadenza se menzionati).
- Impronta carbonica (preferenza ingredienti vegetali/locali).
- Efficienza energetica della cottura.

Rispondi SOLO con JSON valido, zero testo extra:
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

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  if (!data.content || !data.content[0]) {
    throw new Error('API error: ' + JSON.stringify(data));
  }

  const text = data.content.map((b: { text?: string }) => b.text || '').join('');
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

export async function generateMealPlan(ingredients: string): Promise<MealPlan> {
  const prompt = `Sei uno chef e nutrizionista. L'utente ha questi ingredienti in dispensa: ${ingredients}.
Crea un piano alimentare di 7 giorni (Lunedì-Domenica) bilanciato e sostenibile.
Cerca di usare il più possibile quello che l'utente ha già, aggiungendo il minimo indispensabile.

Rispondi SOLO con un array JSON di 7 oggetti, zero testo extra. 
Ogni oggetto deve avere:
{
  "giorno": "Lunedì",
  "colazione": { "nome": "...", "tempo": "...", "calorie": 0 },
  "pranzo": { "nome": "...", "tempo": "...", "calorie": 0 },
  "cena": { "nome": "...", "tempo": "...", "calorie": 0 }
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  const text = data.content.map((b: { text?: string }) => b.text || '').join('');
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}
