'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { supabase, authHeader } from '@/lib/supabase';
import {
  Crown, ShieldCheck, Download, Trash2, AlertTriangle,
  Check, CreditCard, Sparkles, Loader2, User as UserIcon
} from 'lucide-react';
import Link from 'next/link';

const DIETE_DISPONIBILI = [
  'Vegetariano',
  'Vegano',
  'Senza Glutine',
  'Senza Lattosio',
  'Mediterranea',
  'Ipocalorica',
  'Proteica',
];

const ALLERGENI_DISPONIBILI = [
  'Glutine',
  'Lattosio',
  'Uova',
  'Frutta a guscio',
  'Arachidi',
  'Crostacei',
  'Pesce',
  'Soia',
];

interface ProfileData {
  id?: string;
  email?: string;
  is_pro: boolean;
  subscription_status: string;
  subscription_plan: string;
  subscription_period_end?: string | null;
  trial_used: boolean;
  dietary_preferences: string[];
  allergens: string[];
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [diets, setDiets] = useState<string[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<'monthly' | 'annual' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const savedDiets = localStorage.getItem('fc_diet_prefs');
    const savedAllergens = localStorage.getItem('fc_allergens');
    if (savedDiets) {
      try { setDiets(JSON.parse(savedDiets)); } catch { /* ignore */ }
    }
    if (savedAllergens) {
      try { setAllergens(JSON.parse(savedAllergens)); } catch { /* ignore */ }
    }

    async function loadAccount() {
      try {
        const headers = await authHeader();
        if (!headers.Authorization) {
          setIsLoading(false);
          return;
        }
        const res = await fetch('/api/account', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setProfile(data.profile);
            if (Array.isArray(data.profile.dietary_preferences) && data.profile.dietary_preferences.length > 0) {
              setDiets(data.profile.dietary_preferences);
            }
            if (Array.isArray(data.profile.allergens) && data.profile.allergens.length > 0) {
              setAllergens(data.profile.allergens);
            }
          }
        }
      } catch (err) {
        console.error('Errore caricamento profilo:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAccount();
  }, []);

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setList(list.filter((x) => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    setStatusMessage(null);
    setPrefsSaved(false);
    localStorage.setItem('fc_diet_prefs', JSON.stringify(diets));
    localStorage.setItem('fc_allergens', JSON.stringify(allergens));

    try {
      const headers = await authHeader();
      if (!headers.Authorization) {
        setStatusMessage(
          'Preferenze salvate solo su questo dispositivo. Accedi al tuo account per sincronizzarle nel tuo profilo cloud.'
        );
        return;
      }

      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ dietaryPreferences: diets, allergens }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatusMessage(
          data.error || 'Impossibile salvare le preferenze sul server. Riprova tra qualche istante.'
        );
        return;
      }

      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 2500);
    } catch {
      setStatusMessage(
        'Errore di rete durante il salvataggio delle preferenze sul server.'
      );
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleCheckout = async (plan: 'monthly' | 'annual') => {
    setCheckoutLoading(plan);
    setStatusMessage(null);
    try {
      const headers = await authHeader();
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setStatusMessage(data.error || 'Impossibile avviare il checkout.');
      }
    } catch {
      setStatusMessage('Errore di connessione con il server di pagamento.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    setStatusMessage(null);
    try {
      const headers = await authHeader();
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setStatusMessage(data.error || 'Portale abbonamenti non disponibile.');
      }
    } catch {
      setStatusMessage('Impossibile contattare Stripe Customer Portal.');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleExportData = async () => {
    setStatusMessage(null);
    try {
      const headers = await authHeader();
      if (!headers.Authorization) {
        setStatusMessage('Devi accedere al tuo account per esportare i tuoi dati dal server.');
        return;
      }

      const res = await fetch('/api/account?export=true', { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatusMessage(data.error || "Errore durante l'esportazione dei dati dal server.");
        return;
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `frigochef-dati-personali-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setStatusMessage("Errore di rete durante l'esportazione dei dati.");
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setStatusMessage(null);
    try {
      const headers = await authHeader();
      if (!headers.Authorization) {
        setStatusMessage('Devi accedere al tuo account per poterne richiedere la cancellazione.');
        setDeleting(false);
        return;
      }

      const res = await fetch('/api/account', { method: 'DELETE', headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatusMessage(
          data.error || "Impossibile completare l'eliminazione dell'account. Riprova o contatta il supporto."
        );
        setDeleting(false);
        return;
      }

      localStorage.clear();
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch {
      setStatusMessage("Errore di rete durante l'eliminazione dell'account.");
      setDeleting(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: 'var(--fc-cream)' }}>
      <Navbar />

      <div className="fc-container" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(50,133,103,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--fc-fresh)',
              }}
            >
              <UserIcon size={20} />
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--fc-forest)' }}>
              Profilo, Abbonamento & Privacy
            </h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--fc-sage)' }}>
            Gestisci il tuo piano FrigoChef Plus, le preferenze alimentari, gli allergeni e i tuoi diritti GDPR.
          </p>
        </div>

        {statusMessage && (
          <div
            style={{
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(224,109,83,0.12)',
              border: '1px solid rgba(224,109,83,0.35)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--fc-coral)',
            }}
          >
            {statusMessage}
          </div>
        )}

        {/* 1. SEZIONE: IL MIO ABBONAMENTO (Fase 2.4) */}
        <section className="fc-card" style={{ padding: '28px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <div>
              <span className="fc-label" style={{ color: 'var(--fc-fresh)' }}>
                <Crown size={13} /> Il Mio Abbonamento
              </span>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--fc-forest)', marginTop: 4 }}>
                {profile?.is_pro ? 'Piano FrigoChef Plus' : 'Piano Free (Gratuito)'}
              </h2>
            </div>

            <span
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 800,
                background: profile?.is_pro ? 'rgba(50,133,103,0.15)' : 'var(--fc-surface-alt)',
                color: profile?.is_pro ? 'var(--fc-fresh)' : 'var(--fc-sage)',
                border: '1px solid var(--fc-border)',
              }}
            >
              Stato:{' '}
              {profile?.subscription_status === 'trialing'
                ? 'Prova Gratuita (7 giorni)'
                : profile?.subscription_status === 'active'
                ? 'Attivo'
                : profile?.subscription_status === 'past_due'
                ? 'Pagamento da aggiornare'
                : 'Piano Base Gratuito'}
            </span>
          </div>

          {/* Dettagli contrattuali abbonamento */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 14,
              padding: 18,
              background: 'var(--fc-surface-alt)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--fc-border)',
              marginBottom: 24,
            }}
          >
            <div>
              <p className="fc-label">Piano Attuale</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--fc-charcoal)', marginTop: 4 }}>
                {profile?.subscription_plan === 'plus_annual'
                  ? 'FrigoChef Plus Annuale'
                  : profile?.is_pro
                  ? 'FrigoChef Plus Mensile'
                  : 'FrigoChef Free'}
              </p>
            </div>
            <div>
              <p className="fc-label">Prezzo</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--fc-charcoal)', marginTop: 4 }}>
                {profile?.subscription_plan === 'plus_annual'
                  ? '49,99 € / anno'
                  : profile?.is_pro
                  ? '5,99 € / mese'
                  : '0,00 €'}
              </p>
            </div>
            <div>
              <p className="fc-label">Prossimo Rinnovo / Scadenza</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--fc-charcoal)', marginTop: 4 }}>
                {profile?.subscription_period_end
                  ? new Date(profile.subscription_period_end).toLocaleDateString('it-IT')
                  : 'Nessun rinnovo programmato'}
              </p>
            </div>
            <div>
              <p className="fc-label">Quote AI Incluse</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--fc-fresh)', marginTop: 4 }}>
                {profile?.is_pro
                  ? '50 ricette/giorno · 50 scan/mese · 4 piani/mese'
                  : '3 ricette/giorno · 3 scan/mese · 1 piano/mese'}
              </p>
            </div>
          </div>

          {profile?.is_pro ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 13, color: 'var(--fc-sage)', maxWidth: 520 }}>
                Puoi modificare il metodo di pagamento, scaricare le ricevute o disdire l&apos;abbonamento in qualsiasi momento tramite il portale sicuro Stripe. In caso di disdetta conserverai i benefici Plus fino alla fine del periodo già pagato.
              </p>
              <button
                onClick={handleOpenPortal}
                disabled={portalLoading}
                className="fc-btn-secondary"
              >
                {portalLoading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                <span>Gestisci Pagamento o Disdici</span>
              </button>
            </div>
          ) : (
            <div className="fc-two-col">
              {/* Piano Mensile */}
              <div
                style={{
                  padding: 22,
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--fc-border-md)',
                  background: 'var(--fc-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--fc-forest)' }}>
                    FrigoChef Plus Mensile
                  </h3>
                  {!profile?.trial_used && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: 999,
                        background: 'rgba(50,133,103,0.14)',
                        color: 'var(--fc-fresh)',
                      }}
                    >
                      7 giorni di prova gratuita
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--fc-charcoal)' }}>5,99 €</span>
                  <span style={{ fontSize: 13, color: 'var(--fc-sage)' }}>/ mese (rinnovo automatico, disdici quando vuoi)</span>
                </div>
                <button
                  onClick={() => handleCheckout('monthly')}
                  disabled={checkoutLoading !== null}
                  className="fc-btn-primary"
                  style={{ width: '100%', marginTop: 'auto' }}
                >
                  {checkoutLoading === 'monthly' ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  <span>
                    {profile?.trial_used ? 'Attiva Piano Mensile' : 'Inizia 7 Giorni Gratis (Mensile)'}
                  </span>
                </button>
              </div>

              {/* Piano Annuale */}
              <div
                style={{
                  padding: 22,
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--fc-fresh)',
                  background: 'var(--fc-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--fc-forest)' }}>
                    FrigoChef Plus Annuale
                  </h3>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: 999,
                      background: 'var(--fc-lime)',
                      color: '#174C3C',
                    }}
                  >
                    Risparmi il 30%
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--fc-charcoal)' }}>49,99 €</span>
                  <span style={{ fontSize: 13, color: 'var(--fc-sage)' }}>/ anno (pari a 4,16 €/mese)</span>
                </div>
                <button
                  onClick={() => handleCheckout('annual')}
                  disabled={checkoutLoading !== null}
                  className="fc-btn-primary"
                  style={{ width: '100%', marginTop: 'auto' }}
                >
                  {checkoutLoading === 'annual' ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Crown size={16} />
                  )}
                  <span>
                    {profile?.trial_used ? 'Attiva Piano Annuale' : 'Inizia 7 Giorni Gratis (Annuale)'}
                  </span>
                </button>
              </div>
            </div>
          )}

          <p style={{ fontSize: 12, color: 'var(--fc-sage)', marginTop: 14, lineHeight: 1.5 }}>
            Informazione precontrattuale: la prova gratuita di 7 giorni è utilizzabile una sola volta per utente. Puoi disdire gratuitamente entro la fine del 7° giorno senza alcun addebito. Consulta i{' '}
            <Link href="/terms" style={{ color: 'var(--fc-fresh)', fontWeight: 700 }}>
              Termini e Condizioni
            </Link>{' '}
            per maggiori informazioni sul rinnovo e sul diritto di recesso.
          </p>
        </section>

        {/* 2. SEZIONE: PREFERENZE ALIMENTARI & ALLERGENI (Fase 3.4) */}
        <section className="fc-card" style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <span className="fc-label">Personalizzazione AI</span>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--fc-forest)', marginTop: 4 }}>
              Preferenze Alimentari & Allergeni Dichiarati
            </h2>
            <p style={{ fontSize: 13, color: 'var(--fc-sage)', marginTop: 4 }}>
              Queste impostazioni vengono applicate automaticamente a tutte le ricette e ai piani settimanali generati dall&apos;AI.
            </p>
          </div>

          <div>
            <p className="fc-label" style={{ marginBottom: 10 }}>Regime Alimentare</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DIETE_DISPONIBILI.map((d) => {
                const active = diets.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleItem(diets, setDiets, d)}
                    className="fc-quick-pill"
                    style={{
                      background: active ? 'var(--fc-btn-bg)' : 'var(--fc-surface-alt)',
                      color: active ? '#fff' : 'var(--fc-charcoal)',
                      borderColor: active ? 'var(--fc-btn-bg)' : 'var(--fc-border)',
                    }}
                  >
                    {active && <Check size={12} />}
                    <span>{d}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="fc-label" style={{ marginBottom: 10 }}>Allergeni o Intolleranze da Escludere</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ALLERGENI_DISPONIBILI.map((a) => {
                const active = allergens.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleItem(allergens, setAllergens, a)}
                    className="fc-quick-pill"
                    style={{
                      background: active ? 'var(--fc-coral)' : 'var(--fc-surface-alt)',
                      color: active ? '#fff' : 'var(--fc-charcoal)',
                      borderColor: active ? 'var(--fc-coral)' : 'var(--fc-border)',
                    }}
                  >
                    {active && <Check size={12} />}
                    <span>Senza {a}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(224,109,83,0.10)',
              border: '1px solid rgba(224,109,83,0.3)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <AlertTriangle size={16} style={{ color: 'var(--fc-coral)', flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 12, color: 'var(--fc-charcoal)', lineHeight: 1.5 }}>
              <strong>Avvertenza importante sugli allergeni:</strong> L&apos;intelligenza artificiale tiene conto delle tue preferenze, ma non sostituisce mai la verifica diretta delle etichette alimentari e non garantisce l&apos;assenza di contaminazioni crociate.
            </p>
          </div>

          <div>
            <button
              onClick={handleSavePreferences}
              disabled={savingPrefs}
              className="fc-btn-primary"
            >
              {prefsSaved ? <Check size={16} /> : <ShieldCheck size={16} />}
              <span>{prefsSaved ? 'Preferenze Salvate!' : 'Salva Preferenze Alimentari'}</span>
            </button>
          </div>
        </section>

        {/* 3. SEZIONE: PRIVACY, ESPORTAZIONE DATI & CANCELLAZIONE ACCOUNT (Fase 5.2 GDPR) */}
        <section className="fc-card" style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <span className="fc-label">Tutela Dati Personali (GDPR)</span>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--fc-forest)', marginTop: 4 }}>
              I Tuoi Dati e il Tuo Account
            </h2>
            <p style={{ fontSize: 13, color: 'var(--fc-sage)', marginTop: 4 }}>
              In conformità al Regolamento UE 2016/679 (GDPR), hai pieno controllo sui tuoi dati personali.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <button onClick={handleExportData} className="fc-btn-secondary">
              <Download size={16} />
              <span>Esporta tutti i miei dati (JSON)</span>
            </button>

            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="fc-btn-secondary"
                style={{ color: 'var(--fc-coral)', borderColor: 'rgba(224,109,83,0.4)' }}
              >
                <Trash2 size={16} />
                <span>Elimina Account e Dati Personali</span>
              </button>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="fc-btn-primary"
                  style={{ background: 'var(--fc-coral)' }}
                >
                  {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  <span>Conferma Eliminazione Definitiva</span>
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="fc-btn-secondary"
                >
                  Annulla
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
