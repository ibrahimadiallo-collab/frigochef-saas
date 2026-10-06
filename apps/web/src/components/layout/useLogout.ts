'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function useLogout() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await createClient().auth.signOut();
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }, [router]);
  return { logout, isLoggingOut };
}
