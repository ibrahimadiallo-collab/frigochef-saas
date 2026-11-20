import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Area Riservata Amministrazione | FrigoChef',
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Passo 10 P1 — Rimossi tutti i numeri simulati ("Utenti Attivi 1,284", "Revenue €842.50")
 * e bloccata l'indicizzazione tramite metadata robots noindex/nofollow.
 */
export default function AdminDashboard() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--fc-cream)' }}>
      <Navbar />
      <div className="fc-container" style={{ maxWidth: 680 }}>
        <div
          className="fc-card"
          style={{
            padding: '36px 28px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'rgba(50,133,103,0.12)',
              color: 'var(--fc-fresh)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={26} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--fc-forest)' }}>
            Console di Amministrazione Riservata
          </h1>
          <p style={{ fontSize: 14, color: 'var(--fc-sage)', maxWidth: 460, lineHeight: 1.6 }}>
            Per ragioni di sicurezza e trasparenza, le metriche operative sono consultabili
            esclusivamente tramite le dashboard ufficiali autenticate di Supabase, Stripe e Vercel,
            oppure interrogando l&apos;endpoint diagnostico protetto <code>/api/health</code> con la
            chiave <code>HEALTHCHECK_SECRET</code>.
          </p>
          <Link
            href="/"
            className="fc-btn-primary"
            style={{ textDecoration: 'none', marginTop: 8 }}
          >
            Torna alla Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
