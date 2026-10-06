import 'server-only';
import { GoogleGenAI } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import type { AiProvider } from '@/types';

// I secret vengono letti SOLO qui, lato server. Nessuna variabile NEXT_PUBLIC_.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

let gemini: GoogleGenAI | null = null;
let anthropic: Anthropic | null = null;

function getGemini(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  gemini ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return gemini;
}

function getAnthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  anthropic ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropic;
}

export function availableProviders(): AiProvider[] {
  const list: AiProvider[] = [];
  if (process.env.GEMINI_API_KEY) list.push('gemini');
  if (process.env.ANTHROPIC_API_KEY) list.push('claude');
  return list;
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super('AI is not configured on the server. Please set GEMINI_API_KEY or ANTHROPIC_API_KEY.');
    this.name = 'AiNotConfiguredError';
  }
}

export interface ImageInput {
  base64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
}

export interface AiTextResult {
  text: string;
  provider: AiProvider;
}

async function geminiText(prompt: string, image?: ImageInput): Promise<string> {
  const client = getGemini();
  if (!client) throw new AiNotConfiguredError();
  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];
  if (image) parts.push({ inlineData: { data: image.base64, mimeType: image.mimeType } });
  parts.push({ text: prompt });
  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseMimeType: 'application/json', temperature: 0.4 },
  });
  return response.text ?? '';
}

async function claudeText(prompt: string, image?: ImageInput, maxTokens = 2048): Promise<string> {
  const client = getAnthropic();
  if (!client) throw new AiNotConfiguredError();
  const content: Anthropic.ContentBlockParam[] = [];
  if (image) {
    content.push({ type: 'image', source: { type: 'base64', media_type: image.mimeType, data: image.base64 } });
  }
  content.push({ type: 'text', text: prompt });
  const message = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content }],
  });
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

/**
 * Esegue il prompt con i provider nell'ordine indicato, passando al successivo in caso di errore.
 * Vision: Gemini → Claude. Ricette: Claude → Gemini.
 */
export async function runWithFallback(
  order: AiProvider[],
  prompt: string,
  options: { image?: ImageInput; maxTokens?: number } = {},
): Promise<AiTextResult> {
  const configured = order.filter((p) => availableProviders().includes(p));
  if (configured.length === 0) throw new AiNotConfiguredError();

  let lastError: unknown = null;
  for (const provider of configured) {
    try {
      const text =
        provider === 'gemini'
          ? await geminiText(prompt, options.image)
          : await claudeText(prompt, options.image, options.maxTokens);
      if (text.trim()) return { text, provider };
      lastError = new Error(`${provider} returned an empty response`);
    } catch (err) {
      lastError = err;
      console.error(`[ai] ${provider} failed:`, err instanceof Error ? err.message : err);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('All AI providers failed');
}
