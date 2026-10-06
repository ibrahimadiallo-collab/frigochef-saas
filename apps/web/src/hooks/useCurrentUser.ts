'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { Profile } from '@/types';

interface CurrentUser {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  /** Nome da mostrare: full_name → metadata → parte locale dell'email. */
  displayName: string;
}

export function useCurrentUser(): CurrentUser {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }
    const supabase = createClient();
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setUser(data.user);
      if (data.user) {
        const { data: row } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle<Profile>();
        if (active) setProfile(row ?? null);
      }
      if (active) setIsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const meta = user?.user_metadata as { full_name?: unknown } | undefined;
  const metaName = typeof meta?.full_name === 'string' ? meta.full_name : null;
  const displayName = profile?.full_name || metaName || user?.email?.split('@')[0] || 'Chef';

  return { user, profile, isLoading, displayName };
}
