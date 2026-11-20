import crypto from 'node:crypto';

/**
 * Passo 4 P1 — Estrazione IP da header proxy fidati (Vercel Edge) e HMAC-SHA256 con segreto dedicato.
 *
 * Sicurezza e GDPR (Art. 5 & 32):
 * - Usa `crypto.createHmac('sha256', secret)` con `process.env.IP_HASH_SECRET`.
 * - Non usa mai `.slice(0, 16)` su chiavi JWT (che avrebbero prefisso costante `eyJhbGciOiJIUzI1`).
 * - Se `IP_HASH_SECRET` non è definito in sviluppo, deriva una chiave a 256 bit dall'intera
 *   `SUPABASE_SERVICE_ROLE_KEY` tramite SHA-256 (sfruttando tutta l'entropia della firma finale).
 * - I record in `ai_usage_logs.ip_hash` vengono automaticamente azzerati (`NULL`) dopo 30 giorni.
 */
export function resolveIpHmacSecret(
  customSecret?: string,
  env: NodeJS.ProcessEnv = process.env
): Buffer {
  const explicit = (customSecret || env.IP_HASH_SECRET || '').trim();
  if (explicit.length >= 16) {
    return Buffer.from(explicit, 'utf8');
  }

  const fullServiceKey = (env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (fullServiceKey.length >= 20) {
    return crypto.createHash('sha256').update(`fc-hmac-key-v2:${fullServiceKey}`).digest();
  }

  // Fallback esclusivo per test unitari locali privi di variabili env
  return crypto.createHash('sha256').update('fc-local-dev-ephemeral-hmac-key').digest();
}

export function getTrustedClientIpHash(req: Request, customSecret?: string): string {
  const vercelIp = req.headers.get('x-vercel-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const forwardedFor = req.headers.get('x-forwarded-for');

  let rawIp = '0.0.0.0';
  if (vercelIp) {
    rawIp = vercelIp.split(',')[0].trim();
  } else if (realIp) {
    rawIp = realIp.trim();
  } else if (forwardedFor) {
    const hops = forwardedFor
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    rawIp = hops[hops.length - 1] || '0.0.0.0';
  }

  const secretKey = resolveIpHmacSecret(customSecret);
  return crypto
    .createHmac('sha256', secretKey)
    .update(`fc-ip-v2:${rawIp}`)
    .digest('hex');
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
