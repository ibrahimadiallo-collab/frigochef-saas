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

// In-memory fallback counter per IP / utente (attivo anche se il DB non ha ancora la tabella ai_usage_logs)
const memoryQuotaStore = new Map<string, { count: number; resetAt: number }>();

function getPeriodWindowMs(period: 'day' | 'month'): number {
  return period === 'day' ? 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
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

export async function verifyAndConsumeAIQuota(
  req: Request,
  action: AIActionType
): Promise<{
  allowed: boolean;
  isPro: boolean;
  userId: string | null;
  remaining: number;
  limit: number;
  errorMessage?: string;
}> {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'local';
  const user = await getUserFromRequest(req);
  const userId = user?.id || null;

  let isPro = false;
  if (userId) {
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_pro, subscription_status, subscription_period_end')
        .eq('id', userId)
        .single();

      if (profile) {
        const periodValid =
          !profile.subscription_period_end ||
          new Date(profile.subscription_period_end).getTime() > Date.now();
        isPro = Boolean(profile.is_pro && periodValid);
      }
    } catch {
      isPro = false;
    }
  }

  const tier = isPro ? PLAN_LIMITS.plus[action] : PLAN_LIMITS.free[action];
  const actorKey = `${action}:${userId || ip}`;
  const now = Date.now();
  const windowMs = getPeriodWindowMs(tier.period);

  // 1. Verifica in-memory per IP/Actor
  let memRecord = memoryQuotaStore.get(actorKey);
  if (!memRecord || now > memRecord.resetAt) {
    memRecord = { count: 0, resetAt: now + windowMs };
    memoryQuotaStore.set(actorKey, memRecord);
  }

  // 2. Se l'utente è autenticato, verifica anche i log persistenti su Supabase
  let dbCount = memRecord.count;
  if (userId) {
    try {
      const since = getPeriodStartISO(tier.period);
      const { count, error } = await supabaseAdmin
        .from('ai_usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('action_type', action)
        .gte('created_at', since);

      if (!error && typeof count === 'number') {
        dbCount = Math.max(dbCount, count);
      }
    } catch {
      // Usa contatore in-memory come fallback sicuro
    }
  }

  if (dbCount >= tier.max) {
    const planName = isPro ? 'FrigoChef Plus' : 'Free';
    return {
      allowed: false,
      isPro,
      userId,
      remaining: 0,
      limit: tier.max,
      errorMessage: isPro
        ? `Hai raggiunto il limite del piano ${planName} (${tier.label}).`
        : `Hai raggiunto il limite del piano Free (${tier.label}). Passa a FrigoChef Plus per sbloccare fino a ${PLAN_LIMITS.plus[action].label}.`,
    };
  }

  // Consuma 1 unità di quota
  memRecord.count = dbCount + 1;

  if (userId) {
    try {
      await supabaseAdmin.from('ai_usage_logs').insert([
        {
          user_id: userId,
          ip_hash: ip,
          action_type: action,
        },
      ]);
    } catch {
      // Non blocca se la tabella log non è ancora migrata
    }
  }

  return {
    allowed: true,
    isPro,
    userId,
    remaining: Math.max(0, tier.max - memRecord.count),
    limit: tier.max,
  };
}
