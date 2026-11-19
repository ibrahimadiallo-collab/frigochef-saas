import crypto from 'node:crypto';

/**
 * ALTO 3 — Estrazione IP da header proxy fidati (Vercel Edge) e pseudonimizzazione SHA-256.
 *
 * Finalità e Conservazione (GDPR Art. 5 & 32):
 * - L'indirizzo IP in chiaro NON viene mai salvato nel database.
 * - Viene estratto prioritariamente da `x-vercel-forwarded-for` (header sovrascritto dal proxy edge
 *   di Vercel e non falsificabile dal client) e immediatamente convertito in un digest SHA-256
 *   salato e troncato a 32 caratteri esadecimali, usato esclusivamente per prevenire abusi API.
 */
export function getTrustedClientIpHash(req: Request): string {
  const vercelIp = req.headers.get('x-vercel-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const forwardedFor = req.headers.get('x-forwarded-for');

  let rawIp = '0.0.0.0';
  if (vercelIp) {
    rawIp = vercelIp.split(',')[0].trim();
  } else if (realIp) {
    rawIp = realIp.trim();
  } else if (forwardedFor) {
    const hops = forwardedFor.split(',').map((s) => s.trim()).filter(Boolean);
    rawIp = hops[hops.length - 1] || '0.0.0.0';
  }

  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 16) || 'frigochef-ip-salt-2026';
  return crypto
    .createHash('sha256')
    .update(`fc-ip-v1:${salt}:${rawIp}`)
    .digest('hex')
    .slice(0, 32);
}

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
  const ipHash = getTrustedClientIpHash(req);
  const key = `${bucket}:${ipHash}`;
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
