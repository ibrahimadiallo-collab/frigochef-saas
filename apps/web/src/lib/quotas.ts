import { supabaseAdmin, getUserFromRequest } from './supabase-admin';

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

// Mutex in-process per serializzare richieste simultanee dello stesso utente anche nel fallback applicativo
const userLocks = new Map<string, Promise<unknown>>();

async function withUserLock<T>(lockKey: string, fn: () => Promise<T>): Promise<T> {
  const previous = userLocks.get(lockKey) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  userLocks.set(lockKey, previous.then(() => current));

  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (userLocks.get(lockKey) === current) {
      userLocks.delete(lockKey);
    }
  }
}

function getPeriodStartISO(period: 'day' | 'month'): string {
  const now = new Date();
  if (period === 'day') {
    now.setUTCHours(0, 0, 0, 0);
  } else {
    now.setUTCDate(1);
    now.setUTCHours(0, 0, 0, 0);
  }
  return now.toISOString();
}

/**
 * CRITICO 1 — Verifica e consumo ATOMICO e PERSISTENTE della quota AI.
 * 1. Richiede obbligatoriamente un utente autenticato con JWT valido (401 se non autenticato).
 * 2. Esegue la funzione atomica PostgreSQL `consume_ai_quota` (protetta da pg_advisory_xact_lock).
 * 3. Non utilizza contatori volatili in memoria: fail-closed se il database restituisce un errore.
 */
export async function verifyAndConsumeAIQuota(
  req: Request,
  action: AIActionType
): Promise<QuotaCheckResult> {
  const user = await getUserFromRequest(req);
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
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'local';

  return withUserLock(`${userId}:${action}`, async () => {
    // 1. Tentativo primario: funzione RPC atomica su PostgreSQL (`public.consume_ai_quota`)
    if (typeof supabaseAdmin.rpc === 'function') {
      const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('consume_ai_quota', {
        p_user_id: userId,
        p_action_type: action,
        p_ip_hash: ip,
      });

      if (!rpcError && rpcData && typeof rpcData === 'object') {
        const isPro = Boolean(rpcData.is_pro);
        const allowed = Boolean(rpcData.allowed);
        const limit = Number(rpcData.limit) || (isPro ? PLAN_LIMITS.plus[action].max : PLAN_LIMITS.free[action].max);
        const remaining = Number(rpcData.remaining) || 0;
        const tier = isPro ? PLAN_LIMITS.plus[action] : PLAN_LIMITS.free[action];

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

      // Se l'errore NON è "funzione non ancora migrata" (PGRST202 / 42883), fail-closed per sicurezza
      if (rpcError && rpcError.code !== 'PGRST202' && rpcError.code !== '42883') {
        console.error('Errore RPC consume_ai_quota:', rpcError);
        return {
          allowed: false,
          statusCode: 503,
          isPro: false,
          userId,
          remaining: 0,
          limit: 0,
          errorMessage: 'Impossibile verificare la quota AI sul database. Riprova tra qualche istante.',
        };
      }
    }

    // 2. Fallback persistente su database (serializzato tramite withUserLock) se la migrazione RPC non è ancora stata applicata
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_pro, subscription_period_end')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Errore lettura profilo per quota AI:', profileError);
      return {
        allowed: false,
        statusCode: 503,
        isPro: false,
        userId,
        remaining: 0,
        limit: 0,
        errorMessage: 'Impossibile verificare il piano utente sul database.',
      };
    }

    const periodValid =
      !profile?.subscription_period_end ||
      new Date(profile.subscription_period_end).getTime() > Date.now();
    const isPro = Boolean(profile?.is_pro && periodValid);
    const tier = isPro ? PLAN_LIMITS.plus[action] : PLAN_LIMITS.free[action];
    const since = getPeriodStartISO(tier.period);

    const { count, error: countError } = await supabaseAdmin
      .from('ai_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action_type', action)
      .gte('created_at', since);

    if (countError || typeof count !== 'number') {
      console.error('Errore conteggio ai_usage_logs:', countError);
      return {
        allowed: false,
        statusCode: 503,
        isPro,
        userId,
        remaining: 0,
        limit: tier.max,
        errorMessage: 'Servizio di verifica quote temporaneamente non disponibile.',
      };
    }

    if (count >= tier.max) {
      return {
        allowed: false,
        statusCode: 429,
        isPro,
        userId,
        remaining: 0,
        limit: tier.max,
        errorMessage: isPro
          ? `Hai raggiunto il limite del piano FrigoChef Plus (${tier.label}).`
          : `Hai raggiunto il limite del piano Free (${tier.label}). Passa a FrigoChef Plus per sbloccare fino a ${PLAN_LIMITS.plus[action].label}.`,
      };
    }

    const { error: insertError } = await supabaseAdmin.from('ai_usage_logs').insert([
      {
        user_id: userId,
        ip_hash: ip,
        action_type: action,
      },
    ]);

    if (insertError) {
      console.error('Errore registrazione consumo quota AI:', insertError);
      return {
        allowed: false,
        statusCode: 503,
        isPro,
        userId,
        remaining: 0,
        limit: tier.max,
        errorMessage: 'Impossibile registrare il consumo della quota AI.',
      };
    }

    return {
      allowed: true,
      statusCode: 200,
      isPro,
      userId,
      remaining: Math.max(0, tier.max - (count + 1)),
      limit: tier.max,
    };
  });
}
