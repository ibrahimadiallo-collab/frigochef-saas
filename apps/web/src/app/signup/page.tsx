'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      setError('Authentication is not configured on this server.');
      return;
    }
    setLoading(true);
    setError(null);
    const ref = params.get('ref');
    const { error: otpError } = await createClient().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
        data: ref ? { referred_by: ref } : undefined,
      },
    });
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setStep('code');
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: verifyError } = await createClient().auth.verifyOtp({ email, token: code.trim(), type: 'email' });
    setLoading(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    router.replace('/dashboard');
    router.refresh();
  }

  if (step === 'code') {
    return (
      <form onSubmit={verifyCode} className="space-y-5">
        <p className="text-sm text-white/60">
          We sent a code to <span className="text-white">{email}</span>. Enter it below or click the link in the email.
        </p>
        <div className="space-y-2">
          <Label htmlFor="code">Verification code</Label>
          <Input id="code" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading || code.trim().length < 6}>
          {loading ? 'Verifying…' : 'Verify and continue'}
        </Button>
        <button type="button" onClick={() => setStep('email')} className="w-full text-sm text-white/60 hover:text-white">
          Use a different email
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Sending code…' : 'Send me a code'}
      </Button>
      <p className="text-center text-sm text-white/60">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-emerald-400 hover:text-emerald-300">Log in</Link>
      </p>
    </form>
  );
}

export default function SignupPage() {
  return (
    <AuthCard title="Create your account" subtitle="Turn your fridge into dinner in seconds.">
      <Suspense fallback={null}>
        <SignupForm />
      </Suspense>
    </AuthCard>
  );
}
