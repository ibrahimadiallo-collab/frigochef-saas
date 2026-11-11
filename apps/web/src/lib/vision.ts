import { GoogleGenAI } from "@google/genai";

const geminiKey = process.env.GEMINI_API_KEY;
const ai = geminiKey ? new GoogleGenAI({ apiKey: geminiKey }) : null;

export interface VisionIngredient {
  name: string;
  daysRemaining: number;
  category?: string;
}

export async function analyzeFridgeImage(base64Image: string): Promise<VisionIngredient[]> {
  if (!ai) {
    throw new Error("GEMINI_API_KEY non configurata.");
  }

  const [header, data] = base64Image.split(',');
  const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      {
        parts: [
          {
            text: `Osserva questa foto di un frigorifero o di ingredienti alimentari.
Identifica tutti gli alimenti visibili e restituisci i nomi in ITALIANO.
Per ogni alimento, stima quanti giorni rimarrà fresco a partire da oggi (numero intero) e la categoria ("Verdure", "Proteine", "Latticini", "Dispensa", "Altro").
Restituisci SOLO un array JSON valido di oggetti con "name", "daysRemaining" e "category".
Esempio: [{"name": "Uova", "daysRemaining": 7, "category": "Proteine"}, {"name": "Spinaci freschi", "daysRemaining": 2, "category": "Verdure"}]`
          },
          {
            inlineData: {
              data: data,
              mimeType: mimeType
            }
          }
        ]
      }
    ]
  });

  const text = response.text || '';

  try {
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error("Gemini Vision Parsing Error:", text);
    const words = text.match(/[a-zA-Zàèéìòù]+/g) || [];
    return words.slice(0, 5).map(w => ({
      name: w.toLowerCase(),
      daysRemaining: 3,
      category: 'Altro'
    }));
  }
}
