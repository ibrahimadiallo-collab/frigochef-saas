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
        console.error('Impossibile caricare i dati referral:', err);
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

  if (isLoading || !stats) return null;

  const progressPct = Math.min(100, (stats.inviteCount / 5) * 100);

  return (
    <div className="fc-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span className="fc-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Trophy size={13} style={{ color: 'var(--fc-fresh)' }} />
          Invita un Amico
        </span>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 999,
            background: 'rgba(50,133,103,0.1)',
            border: '1px solid rgba(50,133,103,0.2)',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--fc-fresh)',
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--fc-fresh)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {stats.inviteCount} {stats.inviteCount === 1 ? 'Invito' : 'Inviti'}
          </span>
        </div>
      </div>

      {/* Titolo & descrizione */}
      <div style={{ marginBottom: 18 }}>
        <h4 style={{ fontSize: 18, fontWeight: 800, color: 'var(--fc-forest)', letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 6 }}>
          Regala 1 mese Pro, ricevi 1 mese Pro.
        </h4>
        <p style={{ fontSize: 13, color: 'var(--fc-sage)', lineHeight: 1.55 }}>
          Condividi FrigoChef con chi ama cucinare. Quando si iscrivono, sbloccate entrambi le funzioni Pro.
        </p>
      </div>

      {/* Link copiabile */}
      <div style={{ marginBottom: 20 }}>
        <label className="fc-label" style={{ display: 'block', marginBottom: 6 }}>
          Il tuo link personale
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <div
            style={{
              flex: 1,
              background: 'var(--fc-cream)',
              border: '1.5px solid var(--fc-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 12px',
              fontSize: 12,
              fontFamily: 'monospace',
              color: 'var(--fc-charcoal)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            frigochef.it?ref={stats.referralCode}
          </div>
          <button
            onClick={copyLink}
            title="Copia link"
            style={{
              width: 42,
              height: 42,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: copied ? 'var(--fc-fresh)' : 'var(--fc-forest)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background 0.2s',
            }}
          >
            {copied ? <CheckCircle2 size={17} /> : <Copy size={17} />}
          </button>
        </div>
      </div>

      {/* Milestone progress */}
      <div style={{ paddingTop: 14, borderTop: '1px solid var(--fc-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fc-sage)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Prossimo traguardo
          </span>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--fc-fresh)' }}>
            {stats.inviteCount} / 5 inviti
          </span>
        </div>
        <div
          style={{
            height: 7,
            background: 'rgba(23,76,60,0.08)',
            borderRadius: 999,
            overflow: 'hidden',
            marginBottom: 10,
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, var(--fc-forest), var(--fc-fresh))',
              borderRadius: 999,
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--fc-sage)', fontWeight: 500 }}>
          <Gift size={13} style={{ color: 'var(--fc-fresh)', flexShrink: 0 }} />
          <span>Con 5 inviti sblocchi Fridge Vision AI illimitato.</span>
        </div>
      </div>
    </div>
  );
}
