export async function generateRecipe(ingredients: string, mealType: string, time: string) {
  const prompt = `Sei uno chef italiano esperto e nutrizionista. L'utente ha questi ingredienti: ${ingredients}.
Crea UNA ricetta per ${mealType}, tempo: ${time}.
Calcola accuratamente calorie e macro-nutrienti (proteine, carboidrati, grassi).
Valuta anche l'impatto sul risparmio degli ingredienti (Sustainability Score 0-100).

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
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  if (!data.content || !data.content[0]) {
    throw new Error('API error: ' + JSON.stringify(data));
  }

  const text = data.content.map((b: any) => b.text || '').join('');
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}
