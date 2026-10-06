import Link from 'next/link';
import { ChefHat } from 'lucide-react';

export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label="FrigoChef home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-black shadow-lg shadow-emerald-500/30">
        <ChefHat className="h-5 w-5" aria-hidden />
      </span>
      <span className="text-lg font-bold tracking-tight text-white">
        Frigo<span className="text-emerald-400">Chef</span>
      </span>
    </Link>
  );
}
