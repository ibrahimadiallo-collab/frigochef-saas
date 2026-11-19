'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Mail, HelpCircle, Bug, ShieldAlert, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const FAQ_ITEMS = [
  {
    q: 'Come funziona la prova gratuita di 7 giorni di FrigoChef Plus?',
    a: 'Puoi attivare FrigoChef Plus Mensile o Annuale con 7 giorni di prova gratuita. Se disdici dalla pagina Profilo prima della fine del 7° giorno, non ti verrà addebitato alcun importo.',
  },
  {
    q: 'Come posso disdire il mio abbonamento?',
    a: 'Vai nella pagina Profilo → Il Mio Abbonamento e clicca su "Gestisci Pagamento o Disdici". Verrai indirizzato allo Stripe Customer Portal dove puoi disdire con un clic conservando i benefici fino a fine periodo.',
  },
  {
    q: 'Le foto del mio frigorifero vengono salvate sui vostri server?',
    a: 'No. Le immagini vengono inviate in modo sicuro all’AI solo per riconoscere gli ingredienti presenti e vengono immediatamente eliminate dalla memoria appena restituita la lista testuale.',
  },
  {
    q: 'Come posso esportare i miei dati o eliminare il mio account?',
    a: 'Nella pagina Profilo → I Tuoi Dati e il Tuo Account trovi i pulsanti per scaricare tutti i tuoi dati in formato JSON o eliminare definitivamente il tuo account (GDPR).',
  },
];

export default function ContactPage() {
  const [topic, setTopic] = useState('abbonamento');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) return;
    setSubmitted(true);
  };

  return (
    <main style={{ minHeight: '100vh', background: 'var(--fc-cream)' }}>
      <Navbar />
      <div className="fc-container" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div>
          <span className="fc-label">Centro Assistenza & Supporto</span>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--fc-forest)', marginTop: 4 }}>
            Assistenza, FAQ e Contatti
          </h1>
          <p style={{ fontSize: 14, color: 'var(--fc-sage)', marginTop: 4 }}>
            Hai bisogno di aiuto con il tuo abbonamento, vuoi segnalare un bug o inviare una richiesta privacy?
          </p>
        </div>

        <div className="fc-two-col">
          {/* Modulo richiesta assistenza */}
          <div className="fc-card" style={{ padding: '28px 24px' }}>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--fc-forest)', marginBottom: 16 }}>
              Invia una Richiesta
            </h2>

            {submitted ? (
              <div
                style={{
                  padding: 24,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(50,133,103,0.12)',
                  border: '1px solid rgba(50,133,103,0.3)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <CheckCircle2 size={32} style={{ color: 'var(--fc-fresh)' }} />
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--fc-forest)' }}>
                  Richiesta presa in carico
                </h3>
                <p style={{ fontSize: 13, color: 'var(--fc-charcoal)', lineHeight: 1.5 }}>
                  Grazie! Ti risponderemo all&apos;indirizzo <strong>{email}</strong> entro 24 ore lavorative.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label htmlFor="support-topic" className="fc-label" style={{ marginBottom: 6 }}>
                    Categoria Richiesta
                  </label>
                  <select
                    id="support-topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="fc-input"
                  >
                    <option value="abbonamento">💳 Assistenza Abbonamento / Fatturazione</option>
                    <option value="bug">🐞 Segnalazione Bug Tecnico</option>
                    <option value="privacy">🔒 Richiesta Privacy / GDPR / Cancellazione</option>
                    <option value="altro">💬 Altro / Suggerimenti</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="support-email" className="fc-label" style={{ marginBottom: 6 }}>
                    La tua Email
                  </label>
                  <input
                    id="support-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@esempio.it"
                    className="fc-input"
                  />
                </div>

                <div>
                  <label htmlFor="support-msg" className="fc-label" style={{ marginBottom: 6 }}>
                    Messaggio
                  </label>
                  <textarea
                    id="support-msg"
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Descrivi come possiamo aiutarti…"
                    className="fc-input"
                    style={{ height: 'auto', padding: '12px 14px', resize: 'vertical' }}
                  />
                </div>

                <button type="submit" className="fc-btn-primary" style={{ width: '100%' }}>
                  <Mail size={16} />
                  <span>Invia Richiesta al Supporto</span>
                </button>
              </form>
            )}

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--fc-border)', display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, color: 'var(--fc-sage)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Bug size={13} /> Bug & Tecnico
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <ShieldAlert size={13} /> DPO & Privacy: <Link href="/profile" style={{ color: 'var(--fc-fresh)', fontWeight: 700 }}>Self-service GDPR</Link>
              </span>
            </div>
          </div>

          {/* Domande Frequenti (FAQ) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--fc-forest)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <HelpCircle size={19} style={{ color: 'var(--fc-fresh)' }} />
              Domande Frequenti (FAQ)
            </h2>
            {FAQ_ITEMS.map((item, idx) => (
              <div key={idx} className="fc-card" style={{ padding: '18px 20px' }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--fc-forest)', marginBottom: 6 }}>
                  {item.q}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--fc-charcoal)', lineHeight: 1.55, opacity: 0.85 }}>
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
