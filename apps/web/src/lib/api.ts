import { NextResponse } from 'next/server';
import { AiNotConfiguredError } from './ai-providers';

/** Risposta di errore standard `{ error }` con messaggio comprensibile per l'utente. */
export function jsonError(message: string, status = 400): NextResponse<{ error: string }> {
  return NextResponse.json({ error: message }, { status });
}

export function unauthorized() {
  return jsonError('Please sign in to continue.', 401);
}

/** Logga l'errore reale e restituisce un messaggio sicuro (niente stack o dettagli interni). */
export function serverError(context: string, err: unknown, fallback = 'Something went wrong. Please try again.') {
  console.error(`[api:${context}]`, err);
  if (err instanceof AiNotConfiguredError) return jsonError(err.message, 503);
  return jsonError(fallback, 500);
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
