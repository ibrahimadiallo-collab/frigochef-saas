import Navbar from '@/components/Navbar';
import Link from 'next/link';

export const metadata = {
  title: 'Termini e Condizioni di Servizio | FrigoChef',
  description:
    'Condizioni generali di servizio, informazioni precontrattuali, rinnovo automatico, disdetta e diritto di recesso.',
};

export default function TermsPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--fc-cream)' }}>
      <Navbar />
      <div className="fc-container" style={{ maxWidth: 860 }}>
        <div
          className="fc-card"
          style={{ padding: '36px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}
        >
          <div>
            <span className="fc-label">Condizioni Contrattuali</span>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--fc-forest)', marginTop: 6 }}>
              Termini e Condizioni di Servizio
            </h1>
            <p style={{ fontSize: 13, color: 'var(--fc-sage)', marginTop: 4 }}>
              Ultimo aggiornamento: 20 Novembre 2026
            </p>
          </div>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--fc-forest)' }}>
              1. Descrizione del Servizio e Limiti dell&apos;AI
            </h2>
            <p style={{ fontSize: 14, color: 'var(--fc-charcoal)', lineHeight: 1.65 }}>
              FrigoChef è un assistente digitale per l&apos;organizzazione della cucina domestica che
              utilizza modelli di intelligenza artificiale per suggerire ricette, stimare la
              freschezza degli alimenti e creare piani settimanali.{' '}
              <strong>Avvertenza di sicurezza alimentare e medica:</strong> Le date di scadenza
              stimate dall&apos;AI, i valori nutrizionali e le indicazioni sugli allergeni hanno valore
              puramente indicativo e informativo. L&apos;utente è sempre tenuto a verificare
              direttamente le etichette originali dei prodotti, la presenza di allergeni e lo stato
              di conservazione reale degli alimenti prima del consumo.
            </p>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--fc-forest)' }}>
              2. Piani Free e FrigoChef Plus (Informazioni Precontrattuali)
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
                <strong>Piano Free (0,00 €):</strong> Include gestione frigorifero, lista della
                spesa, fino a 3 ricette AI al giorno, 3 scansioni frigorifero al mese e 1 piano
                settimanale al mese (previa autenticazione gratuita).
              </li>
              <li>
                <strong>FrigoChef Plus Mensile (5,99 €/mese IVA inclusa):</strong> Include fino a
                50 ricette AI al giorno, 50 scansioni frigorifero al mese, 4 piani settimanali al
                mese e personalizzazione nutrizionale avanzata.
              </li>
              <li>
                <strong>FrigoChef Plus Annuale (49,99 €/anno IVA inclusa):</strong> Include tutti i
                benefici Plus con fatturazione annuale.
              </li>
            </ul>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--fc-forest)' }}>
              3. Prova Gratuita, Rinnovo Automatico e Disdetta
            </h2>
            <p style={{ fontSize: 14, color: 'var(--fc-charcoal)', lineHeight: 1.65 }}>
              I nuovi abbonati a FrigoChef Plus possono usufruire di un singolo periodo di{' '}
              <strong>prova gratuita di 7 giorni</strong>. Al termine dei 7 giorni, salvo disdetta
              effettuata prima della scadenza della prova, l&apos;abbonamento si rinnova automaticamente
              al prezzo del piano scelto (mensile o annuale). La disdetta può essere effettuata in
              qualsiasi momento con un clic dalla pagina{' '}
              <Link href="/profile" style={{ color: 'var(--fc-fresh)', fontWeight: 700 }}>
                Profilo → Il Mio Abbonamento
              </Link>{' '}
              tramite lo Stripe Customer Portal. In caso di disdetta, l&apos;utente mantiene l&apos;accesso
              alle funzioni Plus fino al termine del periodo di fatturazione già pagato.
            </p>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--fc-forest)' }}>
              4. Diritto di Recesso
            </h2>
            <p style={{ fontSize: 14, color: 'var(--fc-charcoal)', lineHeight: 1.65 }}>
              Ai sensi del Codice del Consumo (D.Lgs. 206/2005), il consumatore ha diritto di
              recedere dal contratto entro 14 giorni dalla sottoscrizione senza dover fornire alcuna
              motivazione, contattando il supporto tramite la pagina{' '}
              <Link href="/contact" style={{ color: 'var(--fc-fresh)', fontWeight: 700 }}>
                Assistenza e Contatti
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
