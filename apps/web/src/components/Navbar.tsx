'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LogOut, Crown, X, Mail, Loader2, Sun, Moon, Monitor,
  Home, Refrigerator, BookOpen, Calendar, User as UserIcon, KeyRound
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

/* ── Modal Login completo (Fase 1.1: Google OAuth, Magic Link, Email+Password, Recupero Password) ── */
function LoginModal({ onClose }: { onClose: () => void }) {
  const [authMode, setAuthMode] = useState<'magic' | 'password' | 'signup' | 'reset'>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo:
            typeof window !== 'undefined'
              ? `${window.location.origin}/auth/callback`
              : undefined,
          skipBrowserRedirect: true,
        },
      });
      if (!err && data?.url) {
        window.location.href = data.url;
        return;
      }
      setError(
        err?.message ||
          "L'accesso con Google richiede l'attivazione del provider Google su Supabase. Puoi accedere subito con la tua Email qui sotto."
      );
    } catch {
      setError('Impossibile contattare il provider Google. Usa l’accesso con Email qui sotto.');
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

      if (authMode === 'magic') {
        const { error: err } = await supabase.auth.signInWithOtp({
          email,
          options: { data: { referred_by: ref } },
        });
        if (err) setError(err.message);
        else setSentMessage('Ti abbiamo inviato un Link Magico via email. Cliccalo per accedere.');
      } else if (authMode === 'password') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) setError(err.message);
        else onClose();
      } else if (authMode === 'signup') {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { referred_by: ref } },
        });
        if (err) setError(err.message);
        else setSentMessage('Registrazione completata! Controlla la tua email per verificare l’account.');
      } else if (authMode === 'reset') {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/profile` : undefined,
        });
        if (err) setError(err.message);
        else setSentMessage('Email di recupero password inviata. Controlla la tua casella di posta.');
      }
    } catch {
      setError('Errore di rete durante l’autenticazione.');
    } finally {
      setLoading(false);
    }
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

        <div className="flex items-center gap-3 mb-5">
          <FrigoChefLogo size={38} />
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--fc-forest)', marginBottom: 2 }}>
              Accedi a FrigoChef
            </h2>
            <p style={{ fontSize: 13, color: 'var(--fc-sage)' }}>
              Sincronizza dispensa, ricette e piano settimanale
            </p>
          </div>
        </div>

        {sentMessage ? (
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
              Controlla la tua email
            </p>
            <p style={{ fontSize: 13, color: 'var(--fc-sage)' }}>{sentMessage}</p>
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
                height: 48,
                padding: '0 18px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--fc-border-md)',
                background: 'var(--fc-surface)',
                color: 'var(--fc-charcoal)',
                fontWeight: 700,
                fontSize: 14,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                cursor: 'pointer',
                boxShadow: 'var(--fc-shadow-sm)',
              }}
            >
              {googleLoading ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
              <span>Continua con Google</span>
            </button>

            {/* Selettore modalità email */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 4,
                padding: 4,
                borderRadius: 12,
                background: 'var(--fc-surface-alt)',
                border: '1px solid var(--fc-border)',
              }}
            >
              {(
                [
                  { id: 'magic', label: 'Link Magico' },
                  { id: 'password', label: 'Password' },
                  { id: 'signup', label: 'Registrati' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setAuthMode(tab.id);
                    setError('');
                  }}
                  style={{
                    height: 36,
                    borderRadius: 8,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: authMode === tab.id ? 'var(--fc-surface)' : 'transparent',
                    color: authMode === tab.id ? 'var(--fc-forest)' : 'var(--fc-sage)',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label htmlFor="login-email" className="fc-label" style={{ display: 'block', marginBottom: 6 }}>
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

              {(authMode === 'password' || authMode === 'signup') && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label htmlFor="login-password" className="fc-label">
                      Password
                    </label>
                    {authMode === 'password' && (
                      <button
                        type="button"
                        onClick={() => setAuthMode('reset')}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--fc-fresh)',
                          cursor: 'pointer',
                        }}
                      >
                        Password dimenticata?
                      </button>
                    )}
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Almeno 6 caratteri"
                    className="fc-input"
                    required
                  />
                </div>
              )}

              {error && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(224,109,83,0.12)',
                    border: '1px solid rgba(224,109,83,0.35)',
                    fontSize: 12,
                    color: 'var(--fc-charcoal)',
                    lineHeight: 1.4,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="fc-btn-primary"
                style={{ width: '100%' }}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : authMode === 'magic' ? (
                  <Mail size={16} />
                ) : (
                  <KeyRound size={16} />
                )}
                <span>
                  {loading
                    ? 'Attendere…'
                    : authMode === 'magic'
                    ? 'Ricevi Link di Accesso'
                    : authMode === 'password'
                    ? 'Accedi con Password'
                    : authMode === 'signup'
                    ? 'Crea Account Gratuito'
                    : 'Invia Email di Recupero'}
                </span>
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
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');
  const pathname = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem('fc-theme');
    if (saved === 'light' || saved === 'dark') {
      setThemeMode(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      setThemeMode('system');
      document.documentElement.removeAttribute('data-theme');
    }
  }, []);

  const cycleTheme = () => {
    const next: 'system' | 'light' | 'dark' =
      themeMode === 'system' ? 'light' : themeMode === 'light' ? 'dark' : 'system';
    setThemeMode(next);
    if (next === 'system') {
      localStorage.removeItem('fc-theme');
      document.documentElement.removeAttribute('data-theme');
    } else {
      localStorage.setItem('fc-theme', next);
      document.documentElement.setAttribute('data-theme', next);
    }
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
    { href: '/profile', label: 'Profilo', icon: <UserIcon size={18} /> },
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

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 38,
                    padding: '0 15px',
                    borderRadius: 12,
                    fontSize: 14,
                    lineHeight: 1,
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={cycleTheme}
              title={
                themeMode === 'system'
                  ? 'Tema: Sistema (clicca per Chiaro)'
                  : themeMode === 'light'
                  ? 'Tema: Chiaro (clicca per Scuro)'
                  : 'Tema: Scuro (clicca per Sistema)'
              }
              aria-label="Cambia tema Chiaro / Scuro / Sistema"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                border: '1px solid var(--fc-border)',
                background: 'var(--fc-surface)',
                color: 'var(--fc-forest)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {themeMode === 'dark' ? (
                <Moon size={17} />
              ) : themeMode === 'light' ? (
                <Sun size={17} />
              ) : (
                <Monitor size={17} />
              )}
            </button>

            {user && isPro && (
              <div
                className="hidden sm:inline-flex items-center justify-center gap-1.5"
                style={{
                  height: 38,
                  padding: '0 12px',
                  borderRadius: 12,
                  background: 'rgba(217,233,163,0.25)',
                  border: '1px solid rgba(217,233,163,0.6)',
                  lineHeight: 1,
                }}
              >
                <Crown size={13} style={{ color: 'var(--fc-fresh)' }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--fc-forest)' }}>PLUS</span>
              </div>
            )}

            {user ? (
              <div className="relative">
                <button
                  id="user-menu-btn"
                  onClick={() => setMenuOpen(!menuOpen)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    height: 38,
                    padding: '0 12px',
                    borderRadius: 12,
                    background: 'var(--fc-surface)',
                    border: '1px solid var(--fc-border)',
                    color: 'var(--fc-forest)',
                    lineHeight: 1,
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'var(--fc-btn-bg)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 800,
                      flexShrink: 0,
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
                      <Link
                        href="/profile"
                        onClick={() => setMenuOpen(false)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 12px',
                          borderRadius: 8,
                          textDecoration: 'none',
                          fontSize: 13,
                          color: 'var(--fc-charcoal)',
                          fontWeight: 600,
                        }}
                      >
                        <UserIcon size={14} />
                        Profilo & Abbonamento
                      </Link>
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
                style={{
                  minHeight: 38,
                  height: 38,
                  padding: '0 18px',
                  borderRadius: 12,
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                Accedi
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Barra di navigazione inferiore per smartphone (5 voci centrate) */}
      <div
        className="fc-mobile-nav"
        style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}
      >
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
                justifyContent: 'center',
                gap: 4,
                height: 50,
                borderRadius: 12,
                textDecoration: 'none',
                color: active ? 'var(--fc-fresh)' : 'var(--fc-sage)',
                fontWeight: active ? 800 : 600,
                fontSize: 10,
                lineHeight: 1,
                textAlign: 'center',
              }}
            >
              {link.icon}
              <span>{link.label === 'Il Mio Frigo' ? 'Frigo' : link.label}</span>
            </Link>
          );
        })}
      </div>

      <AnimatePresence>
        {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
