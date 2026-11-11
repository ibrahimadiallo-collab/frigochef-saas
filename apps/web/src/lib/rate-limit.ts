/**
 * Rate limiter leggero in-memory per proteggere gli endpoint AI da abusi e picchi di costo.
 */

interface RateRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateRecord>();

export function checkRateLimit(
  req: Request,
  bucket: string,
  maxRequests = 10,
  windowMs = 60_000
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'local';
  const key = `${bucket}:${ip}`;
  const now = Date.now();

  const current = store.get(key);
  if (!current || now > current.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, retryAfterSeconds: 0 };
  }

  if (current.count >= maxRequests) {
    const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  current.count += 1;
  return { allowed: true, remaining: maxRequests - current.count, retryAfterSeconds: 0 };
}
