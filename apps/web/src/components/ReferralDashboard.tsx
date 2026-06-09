'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gift, Copy, CheckCircle2, Trophy } from 'lucide-react';
import { authHeader } from '@/lib/supabase';

interface ReferralStats {
  referralCode: string;
  inviteCount: number;
  rewardLevel: 'Standard' | 'Premium';
}

export default function ReferralDashboard() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/referrals', { headers: await authHeader() });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch referrals:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  const copyLink = () => {
    if (!stats) return;
    const link = `${window.location.origin}?ref=${stats.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return null;
  if (!stats) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 flex items-center gap-2">
          <Trophy size={12} /> Viral Growth Hub
        </h3>
        <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
            {stats.inviteCount} Successful Invites
          </span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 rounded-[32px] p-8 space-y-8 relative overflow-hidden">
        {/* Decorative Circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/5 blur-[60px] rounded-full" />
        
        <div className="relative z-10 space-y-4">
          <h4 className="text-2xl font-bold tracking-tight">Give 1 Month Pro,<br />Get 1 Month Pro.</h4>
          <p className="text-white/40 text-sm max-w-xs leading-relaxed">
            Share FrigoChef with your fellow cooks. When they join, you both unlock the full AI Masterpiece suite.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-[10px] font-bold tracking-widest uppercase text-white/20">Your Unique Link</p>
          <div className="flex gap-2">
            <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-5 flex items-center text-sm font-mono text-white/60 overflow-hidden">
              <span className="truncate whitespace-nowrap">frigochef.ai?ref={stats.referralCode}</span>
            </div>
            <button 
              onClick={copyLink}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                copied ? 'bg-emerald-500 text-black' : 'bg-white text-black hover:bg-emerald-500'
              }`}
            >
              {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
            </button>
          </div>
        </div>

        {/* Milestone Tracker */}
        <div className="pt-4 space-y-6">
          <div className="flex justify-between items-end">
            <p className="text-[10px] font-bold tracking-widest uppercase text-white/20">Next Milestone</p>
            <p className="text-xs font-bold text-emerald-500">{stats.inviteCount} / 5 Invites</p>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (stats.inviteCount / 5) * 100)}%` }}
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            />
          </div>
          <div className="flex items-center gap-3 text-white/30 italic text-[10px] font-medium">
            <Gift size={14} className="text-emerald-500/40" />
            &quot;5 invites unlocks Lifetime AI Vision processing.&quot;
          </div>
        </div>
      </div>
    </div>
  );
}
