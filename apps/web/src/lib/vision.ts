import { GoogleGenAI } from "@google/genai";

const geminiKey = process.env.GEMINI_API_KEY;
const ai = geminiKey ? new GoogleGenAI({ apiKey: geminiKey }) : null;

export async function analyzeFridgeImage(base64Image: string) {
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  
  const [header, data] = base64Image.split(',');
  const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: [
      {
        parts: [
          { text: `Look at this photo of a fridge or ingredients. 
Identify all the edible items you can see. 
For each item, estimate how many days it will stay fresh starting from today.
Return ONLY a valid JSON array of objects with "name" and "daysRemaining" (number).
Example: [{"name": "uova", "daysRemaining": 7}, {"name": "latte", "daysRemaining": 3}]` },
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

  const text = response.text;
  
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error("Gemini 3.5 Vision Parsing Error:", text);
    const words = text.match(/[a-zA-Z]+/g) || [];
    return words.slice(0, 5).map(w => ({ 
      name: w.toLowerCase(), 
      daysRemaining: 3 
    }));
  }
}
