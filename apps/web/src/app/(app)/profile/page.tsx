'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, ChefHat, Crown, LogOut, Mail, ScanLine, Settings, Sparkles, Leaf } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCheckout } from '@/hooks/useCheckout';
import { createClient } from '@/lib/supabase/client';
import { FREE_LIMITS, PRO_PRICE_LABEL } from '@/lib/pricing';
import { useLogout } from '@/components/layout/useLogout';
import ReferralDashboard from '@/components/ReferralDashboard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';

const PRO_FEATURES = ['Unlimited fridge scans', 'Unlimited AI recipes', 'Unlimited weekly meal plans', 'Smart shopping lists'];

interface ProfileStats {
  scans: number;
  recipes: number;
  pantryItems: number;
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, (used / limit) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm"><span className="text-white/70">{label}</span><span className="font-medium text-white">{Math.min(used, limit)} / {limit}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div className={pct >= 100 ? 'h-full bg-amber-400' : 'h-full bg-emerald-500'} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, profile, isLoading, displayName, isPro, usage, refresh } = useCurrentUser();
  const { logout, isLoggingOut } = useLogout();
  const { startCheckout, isCheckingOut } = useCheckout();
  const [fullName, setFullName] = useState('');
  const [saveState, setSaveState] = useState<{ type: 'idle' | 'saving' | 'saved' | 'error'; message?: string }>({ type: 'idle' });
  const [stats, setStats] = useState<ProfileStats | null>(null);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const countOf = (table: string) => supabase.from(table).select('id', { count: 'exact', head: true }).eq('user_id', user.id);
    void Promise.all([countOf('scan_sessions'), countOf('recipes'), countOf('pantry_items')]).then(([scans, recipes, pantry]) =>
      setStats({ scans: scans.count ?? 0, recipes: recipes.count ?? 0, pantryItems: pantry.count ?? 0 }),
    );
  }, [user]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaveState({ type: 'saving' });
    const { error } = await createClient().from('profiles').update({ full_name: fullName.trim() || null }).eq('id', user.id);
    setSaveState(error ? { type: 'error', message: 'Could not save your name. Please try again.' } : { type: 'saved' });
  }

  const bonusUntil = !profile?.is_pro && profile?.pro_expires_at && new Date(profile.pro_expires_at).getTime() > Date.now()
    ? new Date(profile.pro_expires_at)
    : null;

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
        <span className={isPro ? 'ml-auto rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-black' : 'ml-auto rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70'}>
          {isPro ? 'PRO' : 'FREE'}
        </span>
      </Card>

      <Card className="space-y-4 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-semibold text-white"><Crown className="h-4 w-4 text-emerald-400" aria-hidden /> Subscription</h2>
        {profile?.is_pro ? (
          <p className="text-sm text-white/70">You&apos;re on <span className="font-semibold text-emerald-300">FrigoChef Pro</span> ({PRO_PRICE_LABEL}/month). Enjoy unlimited scans, recipes and meal plans.</p>
        ) : bonusUntil ? (
          <p className="text-sm text-white/70">
            Bonus Pro from invites is active until <span className="font-semibold text-emerald-300">{bonusUntil.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}</span>. Subscribe to keep Pro afterwards.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-white/70">You&apos;re on the <span className="font-semibold text-white">Free</span> plan.</p>
            <UsageBar label="Fridge scans this month" used={usage.scansThisMonth} limit={FREE_LIMITS.scansPerMonth} />
            <UsageBar label="AI meal plans" used={usage.mealPlanCount} limit={FREE_LIMITS.mealPlans} />
          </div>
        )}
      </Card>

      {!profile?.is_pro && (
        <motion.div id="upgrade" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="scroll-mt-24">
          <Card className="relative overflow-hidden border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 via-gray-900/70 to-gray-900/70 p-6">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden />
            <div className="relative space-y-4">
              <div className="flex items-center gap-2 text-emerald-300"><Crown className="h-5 w-5" aria-hidden /><span className="text-sm font-semibold uppercase tracking-wide">FrigoChef Pro</span></div>
              <h2 className="text-2xl font-bold text-white">Cook smarter, waste nothing.</h2>
              <p className="text-white/70"><span className="text-3xl font-bold text-white">{PRO_PRICE_LABEL}</span> / month · cancel anytime</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white/75"><Sparkles className="h-4 w-4 text-emerald-400" aria-hidden />{f}</li>
                ))}
              </ul>
              <Button size="lg" onClick={() => void startCheckout('profile')} isLoading={isCheckingOut}>Upgrade to Pro</Button>
            </div>
          </Card>
        </motion.div>
      )}

      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-white"><BarChart3 className="h-4 w-4 text-emerald-400" aria-hidden /> Your kitchen stats</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Fridge scans', value: stats?.scans, Icon: ScanLine },
            { label: 'Recipes', value: stats?.recipes, Icon: ChefHat },
            { label: 'Pantry items', value: stats?.pantryItems, Icon: Leaf },
          ].map(({ label, value, Icon }) => (
            <div key={label} className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-center sm:p-4">
              <Icon className="mx-auto h-5 w-5 text-emerald-400" aria-hidden />
              <p className="mt-2 text-2xl font-bold text-white">{value ?? '—'}</p>
              <p className="text-xs text-white/50">{label}</p>
            </div>
          ))}
        </div>
      </Card>

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

      <ReferralDashboard onClaimed={() => void refresh()} />

      <Button variant="danger" className="w-full" onClick={logout} isLoading={isLoggingOut}>
        <LogOut className="h-4 w-4" aria-hidden /> Logout
      </Button>
    </div>
  );
}
