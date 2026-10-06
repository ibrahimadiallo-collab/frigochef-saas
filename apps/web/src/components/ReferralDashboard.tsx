'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Copy, Gift, Share2, Users } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/http';
import { EVENTS, trackEvent } from '@/lib/analytics';
import { REFERRAL_REWARD_DAYS } from '@/lib/pricing';
import { useToast } from '@/components/ui/ToastProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import type { ReferralResponse } from '@/app/api/referrals/route';

interface ReferralDashboardProps {
  /** Notifica il genitore (es. per ricaricare lo stato Pro) dopo un riscatto riuscito. */
  onClaimed?: () => void;
}

export default function ReferralDashboard({ onClaimed }: ReferralDashboardProps) {
  const toast = useToast();
  const [info, setInfo] = useState<ReferralResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      setInfo(await apiFetch<ReferralResponse>('/api/referrals'));
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const link = info && typeof window !== 'undefined' ? `${window.location.origin}/signup?ref=${info.referralCode}` : '';

  async function copyLink() {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Invite link copied!');
      trackEvent(EVENTS.REFERRAL_SHARED, { method: 'copy' });
    } catch {
      toast.error('Could not copy the link. Please copy it manually.');
    }
  }

  async function shareLink() {
    if (!info || typeof navigator.share !== 'function') return copyLink();
    try {
      await navigator.share({ title: 'FrigoChef', text: `Join me on FrigoChef and get ${REFERRAL_REWARD_DAYS} days of Pro for free!`, url: link });
      trackEvent(EVENTS.REFERRAL_SHARED, { method: 'native_share' });
    } catch {
      // Condivisione annullata dall'utente: nessuna azione.
    }
  }

  async function claim(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setIsClaiming(true);
    try {
      await apiFetch('/api/referrals/claim', { method: 'POST', body: JSON.stringify({ code: code.trim() }) });
      toast.success(`Code redeemed! You unlocked ${REFERRAL_REWARD_DAYS} days of Pro.`);
      setCode('');
      await load();
      onClaimed?.();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsClaiming(false);
    }
  }

  if (isLoading) return null;
  if (!info) {
    return loadError ? (
      <Card className="p-5 text-sm text-white/60">
        {loadError} <button type="button" onClick={() => void load()} className="ml-1 text-emerald-400 hover:underline">Retry</button>
      </Card>
    ) : null;
  }

  const proUntil = info.proExpiresAt && new Date(info.proExpiresAt).getTime() > Date.now() ? new Date(info.proExpiresAt) : null;

  return (
    <motion.div id="referral" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="scroll-mt-24">
      <Card className="relative space-y-6 overflow-hidden p-5 sm:p-6">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden />

        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 font-semibold text-white"><Gift className="h-4 w-4 text-emerald-400" aria-hidden /> Invite friends</h2>
            <p className="max-w-md text-sm text-white/55">
              Give {REFERRAL_REWARD_DAYS} days of Pro, get {REFERRAL_REWARD_DAYS} days of Pro. Every friend who redeems your code extends your Pro access.
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
            <Users className="h-3.5 w-3.5" aria-hidden /> {info.totalInvited} {info.totalInvited === 1 ? 'friend' : 'friends'} joined
          </span>
        </div>

        <div className="relative space-y-2">
          <Label htmlFor="referral-link">Your invite link</Label>
          <div className="flex gap-2">
            <Input id="referral-link" readOnly value={link} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" variant="secondary" onClick={copyLink} aria-label="Copy invite link">
              {copied ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            </Button>
            <Button type="button" onClick={shareLink} aria-label="Share invite link"><Share2 className="h-4 w-4" aria-hidden /></Button>
          </div>
          <p className="text-xs text-white/40">Code: <span className="font-mono text-white/70">{info.referralCode}</span></p>
        </div>

        {(info.totalInvited > 0 || proUntil) && (
          <div className="relative grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-wide text-white/40">Pro days earned</p>
              <p className="mt-1 text-2xl font-bold text-white">{info.rewards.reduce((sum, r) => sum + r.days, 0)}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-wide text-white/40">Bonus Pro active until</p>
              <p className="mt-1 text-lg font-semibold text-white">{proUntil ? proUntil.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</p>
            </div>
          </div>
        )}

        {!info.hasClaimed && (
          <form onSubmit={claim} className="relative flex flex-col gap-2 border-t border-white/5 pt-5 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="claim-code">Got an invite code?</Label>
              <Input id="claim-code" value={code} maxLength={40} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. AB12CD34" autoComplete="off" />
            </div>
            <Button type="submit" variant="secondary" isLoading={isClaiming} disabled={code.trim().length < 4}>Redeem</Button>
          </form>
        )}
      </Card>
    </motion.div>
  );
}
