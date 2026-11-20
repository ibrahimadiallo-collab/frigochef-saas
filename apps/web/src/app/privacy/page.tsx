import Navbar from '@/components/Navbar';
import Link from 'next/link';

export const metadata = {
  title: 'Informativa sulla Privacy (GDPR) | FrigoChef',
  description:
    'Informativa sul trattamento dei dati personali ai sensi degli artt. 13 e 14 del Regolamento UE 2016/679 (GDPR).',
};

export default function PrivacyPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--fc-cream)' }}>
      <Navbar />
      <div className="fc-container" style={{ maxWidth: 860 }}>
        <div
          className="fc-card"
          style={{ padding: '36px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}
        >
          <div>
            <span className="fc-label">Tutela della Privacy · GDPR</span>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--fc-forest)', marginTop: 6 }}>
              Informativa sulla Privacy
            </h1>
            <p style={{ fontSize: 13, color: 'var(--fc-sage)', marginTop: 4 }}>
              Ultimo aggiornamento: 20 Novembre 2026
            </p>
          </div>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--fc-forest)' }}>
              1. Dati Raccolti e Finalità del Trattamento
            </h2>
            <p style={{ fontSize: 14, color: 'var(--fc-charcoal)', lineHeight: 1.65 }}>
              FrigoChef raccoglie esclusivamente i dati strettamente necessari all&apos;erogazione del
              servizio: l&apos;indirizzo email (per l&apos;autenticazione e la gestione dell&apos;account),
              la lista degli ingredienti della dispensa, i piani settimanali, le liste della spesa,
              le preferenze alimentari dichiarate e le ricette salvate. Non conserviamo dati non
              necessari al funzionamento del prodotto.
            </p>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--fc-forest)' }}>
              2. Trattamento delle Immagini del Frigorifero e Fornitori AI
            </h2>
            <p style={{ fontSize: 14, color: 'var(--fc-charcoal)', lineHeight: 1.65 }}>
              Quando utilizzi la funzione <strong>Scansiona il frigo con AI</strong>, la fotografia
              viene trasmessa in modo cifrato (HTTPS) alle API di <strong>Google Gemini</strong>{' '}
              esclusivamente per riconoscere gli alimenti presenti.{' '}
              <strong>
                Le immagini del tuo frigorifero non vengono archiviate in modo permanente sui nostri
                database
              </strong>
              : una volta estratta la lista testuale degli ingredienti, il file immagine viene
              immediatamente scartato dalla memoria del server.
            </p>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--fc-forest)' }}>
              3. Sicurezza API, Hash IP (HMAC-SHA256) e Tempi di Conservazione
            </h2>
            <p style={{ fontSize: 14, color: 'var(--fc-charcoal)', lineHeight: 1.65 }}>
              Per prevenire abusi e proteggere i limiti del servizio, FrigoChef calcola un codice
              crittografico unidirezionale (<code>HMAC-SHA256</code> con chiave segreta dedicata{' '}
              <code>IP_HASH_SECRET</code>) a partire dall&apos;indirizzo IP di connessione. L&apos;indirizzo
              IP in chiaro non viene mai salvato nel database. L&apos;hash associato ai registri di
              utilizzo AI (<code>ai_usage_logs.ip_hash</code>) viene automaticamente azzerato (
              <code>NULL</code>) dopo <strong>30 giorni</strong>.
            </p>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--fc-forest)' }}>
              4. Responsabili Esterni e Dati di Fatturazione Stripe
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
                <strong>Supabase:</strong> Autenticazione utenti e database PostgreSQL protetto da
                Row Level Security (RLS).
              </li>
              <li>
                <strong>Stripe:</strong> Gestione dei pagamenti e degli abbonamenti. FrigoChef non
                memorizza mai i numeri delle carte di pagamento. Quando sottoscrivi un abbonamento,
                Stripe conserva l&apos;email e i dati fiscali delle ricevute secondo gli obblighi di legge
                contabili e fiscali; la cancellazione dell&apos;account FrigoChef disdice immediatamente
                qualsiasi abbonamento attivo su Stripe e rimuove il tuo <code>stripe_customer_id</code>{' '}
                dal nostro database.
              </li>
              <li>
                <strong>Google Cloud / Gemini API:</strong> Elaborazione AI per ricette, piani
                settimanali e riconoscimento visivo degli ingredienti.
              </li>
              <li>
                <strong>Vercel:</strong> Hosting dell&apos;applicazione web e infrastruttura serverless.
              </li>
            </ul>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--fc-forest)' }}>
              5. Diritti dell&apos;Utente (Esportazione e Cancellazione GDPR)
            </h2>
            <p style={{ fontSize: 14, color: 'var(--fc-charcoal)', lineHeight: 1.65 }}>
              Ai sensi degli artt. 15–22 del GDPR, puoi in qualsiasi momento esportare tutti i tuoi
              dati in formato JSON oppure eliminare definitivamente il tuo account e i tuoi dati
              personali direttamente dalla pagina{' '}
              <Link href="/profile" style={{ color: 'var(--fc-fresh)', fontWeight: 700 }}>
                Profilo & Privacy
              </Link>{' '}
              o contattandoci tramite la pagina{' '}
              <Link href="/contact" style={{ color: 'var(--fc-fresh)', fontWeight: 700 }}>
                Assistenza e Contatti
              </Link>
              . Per maggiori informazioni sui cookie tecnici consulta la{' '}
              <Link href="/cookies" style={{ color: 'var(--fc-fresh)', fontWeight: 700 }}>
                Cookie Policy
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
