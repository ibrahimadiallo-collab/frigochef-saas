'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User as UserIcon, LogOut, Crown, X, Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Logo SVG (frigorifero + foglia + sparkle) ── */
function FrigoChefLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="FrigoChef Logo"
    >
      {/* Corpo frigorifero */}
      <rect x="8" y="4" width="24" height="32" rx="5" fill="#174C3C" />
      {/* Separatore */}
      <rect x="8" y="18" width="24" height="1.5" fill="rgba(255,255,255,0.18)" />
      {/* Maniglia superiore */}
      <rect x="27" y="8" width="3" height="7" rx="1.5" fill="rgba(255,255,255,0.35)" />
      {/* Maniglia inferiore */}
      <rect x="27" y="21" width="3" height="7" rx="1.5" fill="rgba(255,255,255,0.35)" />
      {/* Foglia — in basso a destra, sovrapposta */}
      <ellipse cx="28" cy="32" rx="6" ry="3.5" transform="rotate(-40 28 32)" fill="#D9E9A3" />
      <path d="M24 35 Q28 29 33 30" stroke="#328567" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {/* Sparkle AI — in alto a sinistra */}
      <path
        d="M12 7 L12.8 9.2 L15 10 L12.8 10.8 L12 13 L11.2 10.8 L9 10 L11.2 9.2 Z"
        fill="#D9E9A3"
        opacity="0.9"
      />
    </svg>
  );
}

/* ── Modal Login ── */
function LoginModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) localStorage.setItem('referral_code', ref);

      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { data: { referred_by: ref } },
      });

      setLoading(false);
      if (err) {
        setError(
          'Il database Supabase sembra in pausa o non raggiungibile. Puoi comunque accedere subito con il pulsante Demo qui sotto.'
        );
      } else {
        setSent(true);
      }
    } catch {
      setLoading(false);
      setError(
        'Impossibile contattare il server di autenticazione. Usa l’accesso rapido Demo qui sotto per testare l’app.'
      );
    }
  };

  const handleDemoLogin = () => {
    const demoEmail = email.trim() || 'chef@frigochef.it';
    supabase.auth.signInDemo?.(demoEmail);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(23, 76, 60, 0.4)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="fc-card w-full max-w-md p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          style={{ color: 'var(--fc-sage)' }}
          aria-label="Chiudi"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <FrigoChefLogo size={36} />
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--fc-forest)', marginBottom: 2 }}>
              Accedi a FrigoChef
            </h2>
            <p style={{ fontSize: 13, color: 'var(--fc-sage)' }}>
              Riceverai un link magico via email
            </p>
          </div>
        </div>

        {sent ? (
          <div
            className="rounded-xl p-5 text-center"
            style={{ background: 'rgba(217,233,163,0.4)', border: '1px solid rgba(217,233,163,0.8)' }}
          >
            <Mail size={28} style={{ color: 'var(--fc-forest)', margin: '0 auto 8px' }} />
            <p style={{ fontWeight: 700, color: 'var(--fc-forest)', marginBottom: 4 }}>
              Email inviata!
            </p>
            <p style={{ fontSize: 13, color: 'var(--fc-fresh)' }}>
              Controlla la tua casella di posta e clicca il link per accedere.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="fc-label"
                style={{ display: 'block', marginBottom: 6 }}
              >
                La tua email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@esempio.it"
                className="fc-input"
                required
                autoFocus
              />
            </div>
            {error && (
              <div
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(233,139,112,0.12)',
                  border: '1px solid rgba(233,139,112,0.35)',
                }}
              >
                <p style={{ fontSize: 12, color: 'var(--fc-charcoal)', marginBottom: 8, lineHeight: 1.4 }}>
                  {error}
                </p>
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  className="fc-btn-secondary"
                  style={{ width: '100%', padding: '8px 12px', fontSize: 12 }}
                >
                  Accedi subito in Modalità Demo
                </button>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="fc-btn-primary w-full flex items-center justify-center gap-2"
              style={{ width: '100%' }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              {loading ? 'Invio in corso...' : 'Invia Link di Accesso'}
            </button>
            <button
              type="button"
              onClick={handleDemoLogin}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--fc-fresh)',
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              Oppure entra subito come ospite (Demo) →
            </button>
            <p style={{ fontSize: 12, color: 'var(--fc-sage)', textAlign: 'center' }}>
              Nessuna password richiesta. Sicuro e veloce.
            </p>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ── Navbar principale ── */
export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }: { data: { session: Session | null } }) => {
      setUser(session?.user ?? null);
      if (session?.user) await checkProStatus(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
      if (session?.user) await checkProStatus(session.user.id);
      else setIsPro(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkProStatus = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('is_pro')
      .eq('id', userId)
      .single();
    setIsPro(data?.is_pro ?? false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
  };

  const navLinks = [
    { href: '/', label: 'Casa' },
    { href: '/fridge', label: 'Il Mio Frigo' },
    { href: '/recipes', label: 'Ricette' },
    { href: '/planner', label: 'Piano Pasti' },
  ];

  return (
    <>
      <nav
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(247, 246, 239, 0.88)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--fc-border)',
          boxShadow: '0 1px 0 rgba(23,76,60,0.06)',
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            padding: '0 24px',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5"
            style={{ textDecoration: 'none', flexShrink: 0 }}
          >
            <FrigoChefLogo size={34} />
            <span
              style={{
                fontWeight: 800,
                fontSize: 18,
                color: 'var(--fc-forest)',
                letterSpacing: '-0.03em',
              }}
            >
              FrigoChef
            </span>
          </Link>

          {/* Nav links — desktop */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: active ? 700 : 500,
                    color: active ? 'var(--fc-forest)' : 'var(--fc-sage)',
                    background: active ? 'rgba(23,76,60,0.08)' : 'transparent',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Destra: Pro badge + utente */}
          <div className="flex items-center gap-3">
            {/* Badge Pro o pulsante upgrade */}
            {user && (
              isPro ? (
                <div
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{
                    background: 'rgba(217,233,163,0.5)',
                    border: '1px solid rgba(217,233,163,0.9)',
                  }}
                >
                  <Crown size={12} style={{ color: 'var(--fc-forest)' }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--fc-forest)', letterSpacing: '0.05em' }}>
                    PRO
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    const el = document.getElementById('pricing');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hidden md:block fc-btn-secondary"
                  style={{ padding: '7px 16px', fontSize: 13 }}
                >
                  Passa a Pro
                </button>
              )
            )}

            {/* Utente loggato */}
            {user ? (
              <div className="relative">
                <button
                  id="user-menu-btn"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{
                    background: 'rgba(23,76,60,0.07)',
                    border: '1px solid var(--fc-border)',
                    color: 'var(--fc-forest)',
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: 'var(--fc-forest)' }}
                  >
                    {user.email?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <span className="hidden sm:block" style={{ fontSize: 13, fontWeight: 600 }}>
                    {user.email?.split('@')[0]}
                  </span>
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="fc-card absolute right-0 mt-2 w-52 p-2"
                      style={{ zIndex: 60 }}
                    >
                      <div
                        className="px-3 py-2 mb-1"
                        style={{ borderBottom: '1px solid var(--fc-border)' }}
                      >
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--fc-charcoal)' }}>
                          {user.email?.split('@')[0]}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--fc-sage)' }}>{user.email}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left"
                        style={{
                          fontSize: 13,
                          color: 'var(--fc-coral)',
                          fontWeight: 600,
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(233,139,112,0.08)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <LogOut size={14} />
                        Esci
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                id="navbar-login-btn"
                onClick={() => setLoginOpen(true)}
                className="fc-btn-primary"
                style={{ padding: '9px 20px', fontSize: 14 }}
              >
                Accedi
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Modal login */}
      <AnimatePresence>
        {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
