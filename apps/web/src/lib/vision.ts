import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiKey = process.env.GEMINI_API_KEY;
const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

export async function analyzeFridgeImage(base64Image: string) {
  if (!genAI) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  const [header, data] = base64Image.split(',');
  const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `Look at this photo of a fridge or ingredients. 
Identify all the edible items you can see. 
For each item, estimate how many days it will stay fresh starting from today.
Return ONLY a valid JSON array of objects with "name" and "daysRemaining" (number).
Example: [{"name": "uova", "daysRemaining": 7}, {"name": "latte", "daysRemaining": 3}]
Do not add any other text or backticks.`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: data,
        mimeType: mimeType
      }
    }
  ]);

  const response = await result.response;
  const text = response.text();
  
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as { name: string; daysRemaining: number }[];
  } catch {
    console.error("Failed to parse vision JSON:", text);
    // Fallback if AI fails to return JSON
    return text.split(',').map(s => ({ name: s.trim().toLowerCase(), daysRemaining: 3 }));
  }
}
