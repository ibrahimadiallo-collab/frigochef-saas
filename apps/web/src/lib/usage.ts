import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { FREE_LIMITS, isProActive, startOfMonthIso } from './pricing';

export interface Usage {
  isPro: boolean;
  scansThisMonth: number;
  mealPlanCount: number;
}

/** Stato Pro e consumi dell'utente (letture protette da RLS). */
export async function getUsage(supabase: SupabaseClient, userId: string): Promise<Usage> {
  const [profileRes, scansRes, plansRes] = await Promise.all([
    supabase.from('profiles').select('is_pro, pro_expires_at').eq('id', userId).maybeSingle<{ is_pro: boolean | null; pro_expires_at: string | null }>(),
    supabase.from('scan_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', startOfMonthIso()),
    supabase.from('meal_plans').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);
  return {
    isPro: isProActive(profileRes.data),
    scansThisMonth: scansRes.count ?? 0,
    mealPlanCount: plansRes.count ?? 0,
  };
}

export function scanLimitReached(u: Usage): boolean {
  return !u.isPro && u.scansThisMonth >= FREE_LIMITS.scansPerMonth;
}
