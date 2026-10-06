'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isProActive, startOfMonthIso } from '@/lib/pricing';
import type { Profile } from '@/types';

export interface UserUsage {
  scansThisMonth: number;
  mealPlanCount: number;
}

interface CurrentUser {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  /** Nome da mostrare: full_name → metadata → parte locale dell'email. */
  displayName: string;
  /** Abbonamento attivo o Pro temporaneo da referral. */
  isPro: boolean;
  usage: UserUsage;
  refresh: () => Promise<void>;
}

const EMPTY_USAGE: UserUsage = { scansThisMonth: 0, mealPlanCount: 0 };

export function useCurrentUser(): CurrentUser {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [usage, setUsage] = useState<UserUsage>(EMPTY_USAGE);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
    if (data.user) {
      const uid = data.user.id;
      const [profileRes, scansRes, plansRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).maybeSingle<Profile>(),
        supabase.from('scan_sessions').select('id', { count: 'exact', head: true }).eq('user_id', uid).gte('created_at', startOfMonthIso()),
        supabase.from('meal_plans').select('id', { count: 'exact', head: true }).eq('user_id', uid),
      ]);
      setProfile(profileRes.data ?? null);
      setUsage({ scansThisMonth: scansRes.count ?? 0, mealPlanCount: plansRes.count ?? 0 });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const meta = user?.user_metadata as { full_name?: unknown } | undefined;
  const metaName = typeof meta?.full_name === 'string' ? meta.full_name : null;
  const displayName = profile?.full_name || metaName || user?.email?.split('@')[0] || 'Chef';

  return { user, profile, isLoading, displayName, isPro: isProActive(profile), usage, refresh };
}

/** Alias usato dai componenti Pro (ProGate). */
export const useUser = useCurrentUser;
