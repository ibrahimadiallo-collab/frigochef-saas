'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChefHat, User, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    // Check for referral code in URL
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');

    const email = window.prompt("Enter your email to sign in:");
    if (email) {
      // Store ref in local storage so it persists after email redirect
      if (ref) localStorage.setItem('referral_code', ref);

      const { error } = await supabase.auth.signInWithOtp({ 
        email,
        options: {
          data: { referred_by: ref } // Save in user metadata
        }
      });
      if (error) alert(error.message);
      else alert("Check your email for the login link!");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#020202]/80 backdrop-blur-xl border-b border-white/5 px-6 h-16 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2 group">
        <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-black transition-all duration-300">
          <ChefHat size={20} />
        </div>
        <span className="font-sans text-lg font-bold tracking-tighter">
          FRIGOCHEF<span className="text-emerald-500">.</span>
        </span>
      </Link>
      
      <div className="flex items-center gap-8">
        <button className="hidden md:block text-xs font-semibold tracking-widest uppercase text-white/40 hover:text-white transition-colors">
          Philosophy
        </button>
        
        {user ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-white/60">
              <User size={14} />
              <span className="hidden sm:inline">{user.email?.split('@')[0]}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="text-white/40 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button 
            onClick={handleLogin}
            className="bg-white text-black px-6 py-2 rounded-lg text-sm font-bold hover:bg-emerald-500 transition-all shadow-[0_0_20px_rgba(16,185,129,0.1)]"
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
