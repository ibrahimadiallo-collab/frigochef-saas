import Navbar from '@/components/Navbar';
import Link from 'next/link';

export const metadata = {
  title: 'Cookie Policy | FrigoChef',
  description:
    'Informativa sull’utilizzo di cookie tecnici e localStorage nell’applicazione FrigoChef.',
};

export default function CookiesPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--fc-cream)' }}>
      <Navbar />
      <div className="fc-container" style={{ maxWidth: 860 }}>
        <div
          className="fc-card"
          style={{ padding: '36px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}
        >
          <div>
            <span className="fc-label">Trasparenza Tecnica · GDPR & ePrivacy</span>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--fc-forest)', marginTop: 6 }}>
              Cookie Policy
            </h1>
            <p style={{ fontSize: 13, color: 'var(--fc-sage)', marginTop: 4 }}>
              Ultimo aggiornamento: 20 Novembre 2026
            </p>
          </div>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--fc-forest)' }}>
              1. Solo Cookie e Storage Strettamente Necessari
            </h2>
            <p style={{ fontSize: 14, color: 'var(--fc-charcoal)', lineHeight: 1.65 }}>
              FrigoChef utilizza esclusivamente cookie tecnici e chiavi di archiviazione locale (
              <code>localStorage</code>) strettamente necessari per fornire il servizio richiesto
              dall&apos;utente. <strong>Non utilizziamo cookie pubblicitari, di tracciamento o di
              profilazione di terze parti.</strong>
            </p>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--fc-forest)' }}>
              2. Elenco dei Dati Tecnici Salvati sul Dispositivo
            </h2>
            <ul
              style={{
                fontSize: 14,
                color: 'var(--fc-charcoal)',
                lineHeight: 1.7,
                paddingLeft: 20,
                margin: 0,
              }}
            >
              <li>
                <strong>Sessione Supabase Auth (<code>sb-*-auth-token</code>):</strong> Mantiene
                attivo l&apos;accesso sicuro dell&apos;utente autenticato.
              </li>
              <li>
                <strong>Preferenza Tema (<code>fc-theme</code>):</strong> Ricorda la scelta del
                tema grafico (<code>light</code>, <code>dark</code> o <code>system</code>).
              </li>
              <li>
                <strong>Dispensa e Preferenze Locali (<code>fc_local_pantry</code>,{' '}
                <code>fc_diet_prefs</code>, <code>fc_allergens</code>):</strong> Permettono di
                conservare gli ingredienti e i filtri alimentari sul tuo dispositivo.
              </li>
              <li>
                <strong>Stripe Checkout:</strong> Durante il pagamento sul portale sicuro Stripe,
                Stripe utilizza cookie tecnici antifrode necessari all&apos;elaborazione della
                transazione.
              </li>
            </ul>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--fc-forest)' }}>
              3. Come Cancellare lo Storage Locale
            </h2>
            <p style={{ fontSize: 14, color: 'var(--fc-charcoal)', lineHeight: 1.65 }}>
              Puoi cancellare in qualsiasi momento tutti i dati salvati sul dispositivo effettuando
              il logout, eliminando l&apos;account dalla pagina{' '}
              <Link href="/profile" style={{ color: 'var(--fc-fresh)', fontWeight: 700 }}>
                Profilo & Privacy
              </Link>{' '}
              oppure svuotando i dati del sito dalle impostazioni del tuo browser. Consulta anche la
              nostra{' '}
              <Link href="/privacy" style={{ color: 'var(--fc-fresh)', fontWeight: 700 }}>
                Informativa sulla Privacy
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
