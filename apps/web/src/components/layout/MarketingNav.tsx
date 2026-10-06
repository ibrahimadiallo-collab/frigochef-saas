import Link from 'next/link';
import { Logo } from './Logo';
import { buttonClasses } from '@/components/ui/Button';

/** Navbar pubblica (landing e pagine condivise). */
export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0a]/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-white/60 md:flex" aria-label="Sections">
          <a href="#features" className="hover:text-white">Features</a>
          <a href="#pricing" className="hover:text-white">Pricing</a>
          <a href="#faq" className="hover:text-white">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className={buttonClasses('ghost', 'sm')}>Log in</Link>
          <Link href="/signup" className={buttonClasses('primary', 'sm')}>Get started</Link>
        </div>
      </div>
    </header>
  );
}
