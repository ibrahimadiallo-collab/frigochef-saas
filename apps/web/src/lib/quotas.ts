import { supabaseAdmin, getUserFromRequest } from './supabase-admin';
import { getTrustedClientIpHash } from './rate-limit';

export type AIActionType = 'recipe' | 'vision' | 'meal_plan';

export const PLAN_LIMITS = {
  free: {
    recipe: { max: 3, period: 'day' as const, label: '3 ricette AI al giorno' },
    vision: { max: 3, period: 'month' as const, label: '3 scansioni frigorifero al mese' },
    meal_plan: { max: 1, period: 'month' as const, label: '1 piano settimanale AI al mese' },
  },
  plus: {
    recipe: { max: 50, period: 'day' as const, label: '50 ricette AI al giorno' },
    vision: { max: 50, period: 'month' as const, label: '50 scansioni frigorifero al mese' },
    meal_plan: { max: 4, period: 'month' as const, label: '4 piani settimanali AI al mese' },
  },
};

export interface QuotaCheckResult {
  allowed: boolean;
  statusCode: number;
  isPro: boolean;
  userId: string | null;
  remaining: number;
  limit: number;
  errorMessage?: string;
}

export interface QuotaDependencies {
  getUser?: typeof getUserFromRequest;
  db?: typeof supabaseAdmin;
}

/**
 * CRITICO 2 & ALTO 3 — Verifica e consumo ATOMICO e PERSISTENTE della quota AI.
 * 1. Richiede obbligatoriamente un utente autenticato con JWT valido (401 se non autenticato).
 * 2. Invia al database esclusivamente un digest SHA-256 pseudonimizzato dell'IP (mai l'IP in chiaro).
 * 3. Esegue ESCLUSIVAMENTE la funzione RPC atomica PostgreSQL `public.consume_ai_quota`
 *    (protetta da `pg_advisory_xact_lock`).
 * 4. Nessun fallback non atomico: se la RPC non è disponibile o restituisce errore, risponde
 *    fail-closed con HTTP 503 impedendo qualsiasi chiamata AI non protetta.
 */
export async function verifyAndConsumeAIQuota(
  req: Request,
  action: AIActionType,
  deps: QuotaDependencies = {}
): Promise<QuotaCheckResult> {
  const getUser = deps.getUser || getUserFromRequest;
  const db = deps.db || supabaseAdmin;

  const user = await getUser(req);
  if (!user || !user.id) {
    return {
      allowed: false,
      statusCode: 401,
      isPro: false,
      userId: null,
      remaining: 0,
      limit: 0,
      errorMessage: 'Devi accedere al tuo account per utilizzare le funzionalità AI di FrigoChef.',
    };
  }

  const userId = user.id;
  const ipHash = getTrustedClientIpHash(req);

  if (typeof db.rpc !== 'function') {
    return {
      allowed: false,
      statusCode: 503,
      isPro: false,
      userId,
      remaining: 0,
      limit: 0,
      errorMessage: 'Servizio di verifica quote AI non disponibile (RPC non configurata).',
    };
  }

  const { data: rpcData, error: rpcError } = await db.rpc('consume_ai_quota', {
    p_user_id: userId,
    p_action_type: action,
    p_ip_hash: ipHash,
  });

  if (rpcError || !rpcData || typeof rpcData !== 'object') {
    console.error('Errore RPC atomica consume_ai_quota:', rpcError);
    return {
      allowed: false,
      statusCode: 503,
      isPro: false,
      userId,
      remaining: 0,
      limit: 0,
      errorMessage:
        'Servizio di verifica quote AI temporaneamente non disponibile. Riprova tra qualche istante.',
    };
  }

  const isPro = Boolean(rpcData.is_pro);
  const allowed = Boolean(rpcData.allowed);
  const tier = isPro ? PLAN_LIMITS.plus[action] : PLAN_LIMITS.free[action];
  const limit = Number(rpcData.limit) || tier.max;
  const remaining = Number(rpcData.remaining) || 0;

  if (!allowed) {
    return {
      allowed: false,
      statusCode: 429,
      isPro,
      userId,
      remaining: 0,
      limit,
      errorMessage: isPro
        ? `Hai raggiunto il limite del piano FrigoChef Plus (${tier.label}).`
        : `Hai raggiunto il limite del piano Free (${tier.label}). Passa a FrigoChef Plus per sbloccare fino a ${PLAN_LIMITS.plus[action].label}.`,
    };
  }

  return {
    allowed: true,
    statusCode: 200,
    isPro,
    userId,
    remaining,
    limit,
  };
}
