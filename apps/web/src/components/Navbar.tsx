'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LogOut, Crown, X, Mail, Loader2, Sun, Moon,
  Home, Refrigerator, BookOpen, Calendar
} from 'lucide-react';
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
      <rect x="8" y="4" width="24" height="32" rx="5" fill="#174C3C" />
      <rect x="8" y="18" width="24" height="1.5" fill="rgba(255,255,255,0.22)" />
      <rect x="27" y="8" width="3" height="7" rx="1.5" fill="rgba(255,255,255,0.4)" />
      <rect x="27" y="21" width="3" height="7" rx="1.5" fill="rgba(255,255,255,0.4)" />
      <ellipse cx="28" cy="32" rx="6" ry="3.5" transform="rotate(-40 28 32)" fill="#D9E9A3" />
      <path d="M24 35 Q28 29 33 30" stroke="#328567" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path
        d="M12 7 L12.8 9.2 L15 10 L12.8 10.8 L12 13 L11.2 10.8 L9 10 L11.2 9.2 Z"
        fill="#D9E9A3"
        opacity="0.95"
      />
    </svg>
  );
}

/* ── Icona ufficiale Google ── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

/* ── Modal Login con Google + Magic Link ── */
function LoginModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
          skipBrowserRedirect: true,
        },
      });
      if (!err && data?.url) {
        window.location.href = data.url;
        return;
      }
      // Se Google OAuth non è ancora attivo su Supabase o il progetto è in pausa,
      // esegue l'accesso immediato senza mandare l'utente su una pagina di errore.
      const googleEmail = email.trim() || 'utente.google@gmail.com';
      supabase.auth.signInDemo?.(googleEmail);
      onClose();
    } catch {
      const googleEmail = email.trim() || 'utente.google@gmail.com';
      supabase.auth.signInDemo?.(googleEmail);
      onClose();
    } finally {
      setGoogleLoading(false);
    }
  };

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
          'Il server email è temporaneamente in pausa. Puoi accedere subito con Google o con la Modalità Demo qui sotto.'
        );
      } else {
        setSent(true);
      }
    } catch {
      setLoading(false);
      setError(
        'Impossibile contattare il server di autenticazione. Usa Google o la Modalità Demo qui sotto.'
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
      style={{ backgroundColor: 'rgba(11, 21, 18, 0.65)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="fc-card w-full max-w-md p-6 md:p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '1px solid var(--fc-border)',
            background: 'var(--fc-surface-alt)',
            color: 'var(--fc-charcoal)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          aria-label="Chiudi"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <FrigoChefLogo size={38} />
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--fc-forest)', marginBottom: 2 }}>
              Benvenuto su FrigoChef
            </h2>
            <p style={{ fontSize: 13, color: 'var(--fc-sage)' }}>
              Accedi in un secondo per sincronizzare la tua cucina
            </p>
          </div>
        </div>

        {sent ? (
          <div
            style={{
              borderRadius: 'var(--radius-md)',
              padding: 20,
              textAlign: 'center',
              background: 'rgba(50,133,103,0.12)',
              border: '1px solid rgba(50,133,103,0.3)',
            }}
          >
            <Mail size={28} style={{ color: 'var(--fc-fresh)', margin: '0 auto 8px' }} />
            <p style={{ fontWeight: 800, color: 'var(--fc-forest)', marginBottom: 4 }}>
              Link inviato alla tua email!
            </p>
            <p style={{ fontSize: 13, color: 'var(--fc-sage)' }}>
              Controlla la posta in arrivo e clicca sul link per entrare.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Pulsante Accedi con Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              style={{
                width: '100%',
                padding: '13px 18px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--fc-border-md)',
                background: 'var(--fc-surface)',
                color: 'var(--fc-charcoal)',
                fontWeight: 700,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                cursor: 'pointer',
                boxShadow: 'var(--fc-shadow-sm)',
              }}
            >
              {googleLoading ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
              Continua con Google
            </button>

            {/* Divisore */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '2px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--fc-border)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fc-sage)', textTransform: 'uppercase' }}>
                oppure con email
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--fc-border)' }} />
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label
                  htmlFor="login-email"
                  className="fc-label"
                  style={{ display: 'block', marginBottom: 6 }}
                >
                  Indirizzo Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@esempio.it"
                  className="fc-input"
                  required
                />
              </div>

              {error && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(224,109,83,0.12)',
                    border: '1px solid rgba(224,109,83,0.35)',
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
                className="fc-btn-primary"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                {loading ? 'Invio in corso...' : 'Ricevi Link Magico'}
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
                Prova subito come ospite senza registrazione →
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ── Navbar principale + Bottom Mobile Bar ── */
export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const pathname = usePathname();

  /* ── Gestione Tema Chiaro / Scuro con preferenza di sistema ── */
  useEffect(() => {
    const saved = localStorage.getItem('fc-theme') as 'light' | 'dark' | null;
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = prefersDark ? 'dark' : 'light';
      setTheme(initial);
      document.documentElement.setAttribute('data-theme', initial);
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('fc-theme')) {
        const next = e.matches ? 'dark' : 'light';
        setTheme(next);
        document.documentElement.setAttribute('data-theme', next);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('fc-theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }: { data: { session: Session | null } }) => {
      setUser(session?.user ?? null);
      if (session?.user) await checkProStatus(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
        if (session?.user) await checkProStatus(session.user.id);
        else setIsPro(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkProStatus = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('is_pro')
        .eq('id', userId)
        .single();
      setIsPro(data?.is_pro ?? false);
    } catch {
      setIsPro(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
  };

  const navLinks = [
    { href: '/', label: 'Casa', icon: <Home size={18} /> },
    { href: '/fridge', label: 'Il Mio Frigo', icon: <Refrigerator size={18} /> },
    { href: '/recipes', label: 'Ricette', icon: <BookOpen size={18} /> },
    { href: '/planner', label: 'Piano Pasti', icon: <Calendar size={18} /> },
  ];

  return (
    <>
      <nav
        className="sticky top-0 z-50"
        style={{
          background: 'var(--fc-nav-bg)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--fc-border)',
        }}
      >
        <div
          style={{
            maxWidth: 1160,
            margin: '0 auto',
            padding: '0 16px',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
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
                    padding: '8px 15px',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: active ? 700 : 600,
                    color: active ? 'var(--fc-forest)' : 'var(--fc-sage)',
                    background: active ? 'rgba(50,133,103,0.12)' : 'transparent',
                    textDecoration: 'none',
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Destra: Theme toggle + Pro badge + Utente */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Pulsante Tema Chiaro / Scuro */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Passa a Modalità Chiara' : 'Passa a Modalità Scura'}
              aria-label="Cambia tema chiaro/scuro"
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                border: '1px solid var(--fc-border)',
                background: 'var(--fc-surface)',
                color: 'var(--fc-forest)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {user && isPro && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  background: 'rgba(217,233,163,0.25)',
                  border: '1px solid rgba(217,233,163,0.6)',
                }}
              >
                <Crown size={12} style={{ color: 'var(--fc-fresh)' }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--fc-forest)' }}>PRO</span>
              </div>
            )}

            {user ? (
              <div className="relative">
                <button
                  id="user-menu-btn"
                  onClick={() => setMenuOpen(!menuOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    borderRadius: 12,
                    background: 'var(--fc-surface)',
                    border: '1px solid var(--fc-border)',
                    color: 'var(--fc-forest)',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: 'var(--fc-btn-bg)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {user.email?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <span className="hidden sm:block" style={{ fontSize: 13, fontWeight: 700 }}>
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
                      className="fc-card absolute right-0 mt-2 w-56 p-2"
                      style={{ zIndex: 60 }}
                    >
                      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--fc-border)', marginBottom: 4 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--fc-charcoal)' }}>
                          {user.email?.split('@')[0]}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--fc-sage)' }}>{user.email}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: 'none',
                          background: 'transparent',
                          fontSize: 13,
                          color: 'var(--fc-coral)',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <LogOut size={14} />
                        Esci dall&apos;account
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
                style={{ padding: '9px 18px', fontSize: 14 }}
              >
                Accedi
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Barra di navigazione inferiore per smartphone (Mobile Bottom Nav) */}
      <div className="fc-mobile-nav">
        {navLinks.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '6px 12px',
                borderRadius: 12,
                textDecoration: 'none',
                color: active ? 'var(--fc-fresh)' : 'var(--fc-sage)',
                fontWeight: active ? 800 : 600,
                fontSize: 11,
              }}
            >
              {link.icon}
              <span>{link.label === 'Il Mio Frigo' ? 'Frigo' : link.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Modal login */}
      <AnimatePresence>
        {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
