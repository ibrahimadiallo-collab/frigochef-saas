/**
 * Configurazione centrale di fatturazione e kill-switch pagamenti (Passo 1 P0).
 * - Di default i pagamenti sono DISABILITATI (`PAYMENTS_ENABLED !== 'true'`).
 * - Nessun prezzo inline di riserva: il checkout richiede obbligatoriamente gli ID prezzo
 *   del catalogo Stripe (`STRIPE_PRICE_MONTHLY_ID` e `STRIPE_PRICE_ANNUAL_ID`).
 */

export type BillingCycle = 'monthly' | 'annual';

export function arePaymentsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.PAYMENTS_ENABLED === 'true';
}

export function getConfiguredStripePriceId(
  cycle: BillingCycle,
  env: NodeJS.ProcessEnv = process.env
): string | null {
  const raw =
    cycle === 'annual'
      ? env.STRIPE_PRICE_ANNUAL_ID
      : env.STRIPE_PRICE_MONTHLY_ID;

  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('price_') || trimmed === 'price_placeholder') {
    return null;
  }
  return trimmed;
}

export function resolveSafeAppOrigin(req: Request, env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // fallback a origin della richiesta
    }
  }
  try {
    return new URL(req.url).origin;
  } catch {
    return 'http://localhost:3000';
  }
}
