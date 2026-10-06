import 'server-only';

/**
 * Rate limiter a finestra fissa in memoria (per istanza server).
 * Su Vercel ogni istanza ha la propria Map: è una protezione "best effort" contro abusi/costi AI.
 * Per un limite globale in produzione sostituire con Upstash Redis o una tabella Supabase.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export const RATE_LIMITS = {
  scan: { limit: 10, windowMs: 10 * 60 * 1000 },
  recipeGenerate: { limit: 20, windowMs: 10 * 60 * 1000 },
  mealPlan: { limit: 5, windowMs: 60 * 60 * 1000 },
  familyInvite: { limit: 10, windowMs: 60 * 60 * 1000 },
} as const;

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  /** Secondi prima che la finestra si azzeri. */
  retryAfter: number;
}

function sweep(now: number) {
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}

export async function rateLimit(identifier: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const now = Date.now();
  if (buckets.size > MAX_BUCKETS) sweep(now);

  let bucket = buckets.get(identifier);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(identifier, bucket);
  }
  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  if (bucket.count >= limit) return { success: false, remaining: 0, retryAfter };
  bucket.count += 1;
  return { success: true, remaining: limit - bucket.count, retryAfter };
}

/** Risposta 429 standard con header Retry-After. */
export function tooManyRequests(result: RateLimitResult): Response {
  return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': String(result.retryAfter) },
  });
}

/** Solo per test. */
export function __resetRateLimits() {
  buckets.clear();
}
