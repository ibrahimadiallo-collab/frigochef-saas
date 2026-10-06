/** Prezzi e limiti del piano Free condivisi tra client e server (nessun secret). */
export const PRO_PRICE_EUR = 9.99;
export const PRO_PRICE_LABEL = '€9.99';

export const FREE_LIMITS = {
  /** Scansioni del frigo per mese di calendario. */
  scansPerMonth: 3,
  /** Piani settimanali generati in totale. */
  mealPlans: 1,
} as const;

/** Pro attivo: abbonamento Stripe oppure Pro temporaneo da referral non scaduto. */
export function isProActive(profile: { is_pro?: boolean | null; pro_expires_at?: string | null } | null | undefined): boolean {
  if (!profile) return false;
  if (profile.is_pro) return true;
  return Boolean(profile.pro_expires_at && new Date(profile.pro_expires_at).getTime() > Date.now());
}

/** Primo giorno del mese corrente (UTC, ISO). */
export function startOfMonthIso(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** Giorni di Pro regalati a entrambi i lati quando un codice invito viene riscattato. */
export const REFERRAL_REWARD_DAYS = 7;
