'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Crown, LogOut, Mail, Settings, Sparkles } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { createClient } from '@/lib/supabase/client';
import { apiFetch, errorMessage } from '@/lib/http';
import { useLogout } from '@/components/layout/useLogout';
import ReferralDashboard from '@/components/ReferralDashboard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';

const PRO_FEATURES = ['Unlimited fridge scans', 'Unlimited AI recipes', 'Weekly meal plans', 'Priority AI models'];

export default function ProfilePage() {
  const { user, profile, isLoading, displayName } = useCurrentUser();
  const { logout, isLoggingOut } = useLogout();
  const [fullName, setFullName] = useState('');
  const [saveState, setSaveState] = useState<{ type: 'idle' | 'saving' | 'saved' | 'error'; message?: string }>({ type: 'idle' });
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaveState({ type: 'saving' });
    const { error } = await createClient().from('profiles').update({ full_name: fullName.trim() || null }).eq('id', user.id);
    setSaveState(error ? { type: 'error', message: 'Could not save your name. Please try again.' } : { type: 'saved' });
  }

  async function upgrade() {
    setCheckoutError(null);
    setIsCheckingOut(true);
    try {
      const { url } = await apiFetch<{ url: string | null }>('/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID }),
      });
      if (!url) throw new Error('Checkout is unavailable right now.');
      window.location.href = url;
    } catch (err) {
      setCheckoutError(errorMessage(err));
      setIsCheckingOut(false);
    }
  }

  if (isLoading) return <Spinner className="py-24" label="Loading profile…" />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Profile" subtitle="Manage your account and subscription." />

      <Card className="flex items-center gap-4 p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-xl font-bold uppercase text-emerald-300">
          {displayName.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold capitalize text-white">{displayName}</p>
          <p className="flex items-center gap-1.5 truncate text-sm text-white/50"><Mail className="h-3.5 w-3.5" aria-hidden />{user?.email}</p>
        </div>
        <span className={profile?.is_pro ? 'ml-auto rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-black' : 'ml-auto rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70'}>
          {profile?.is_pro ? 'PRO' : 'FREE'}
        </span>
      </Card>

      {!profile?.is_pro && (
        <motion.div id="upgrade" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="scroll-mt-24">
          <Card className="relative overflow-hidden border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 via-gray-900/70 to-gray-900/70 p-6">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden />
            <div className="relative space-y-4">
              <div className="flex items-center gap-2 text-emerald-300"><Crown className="h-5 w-5" aria-hidden /><span className="text-sm font-semibold uppercase tracking-wide">FrigoChef Pro</span></div>
              <h2 className="text-2xl font-bold text-white">Cook smarter, waste nothing.</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white/75"><Sparkles className="h-4 w-4 text-emerald-400" aria-hidden />{f}</li>
                ))}
              </ul>
              <Button size="lg" onClick={upgrade} isLoading={isCheckingOut}>Upgrade to Pro</Button>
              {checkoutError && <p role="alert" className="text-sm text-red-300">{checkoutError}</p>}
            </div>
          </Card>
        </motion.div>
      )}

      <Card id="settings" className="scroll-mt-24 p-5 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-white"><Settings className="h-4 w-4 text-emerald-400" aria-hidden /> Settings</h2>
        <form onSubmit={saveProfile} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="full-name">Display name</Label>
            <Input id="full-name" value={fullName} maxLength={80} onChange={(e) => { setFullName(e.target.value); setSaveState({ type: 'idle' }); }} placeholder="Your name" />
          </div>
          <Button type="submit" isLoading={saveState.type === 'saving'}>Save</Button>
        </form>
        {saveState.type === 'saved' && <p className="mt-2 text-sm text-emerald-300">Saved.</p>}
        {saveState.type === 'error' && <p role="alert" className="mt-2 text-sm text-red-400">{saveState.message}</p>}
      </Card>

      <ReferralDashboard />

      <Button variant="danger" className="w-full" onClick={logout} isLoading={isLoggingOut}>
        <LogOut className="h-4 w-4" aria-hidden /> Logout
      </Button>
    </div>
  );
}
