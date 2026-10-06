import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/ToastProvider';

// Font di sistema (niente next/font/google per evitare download di rete in build).

export const metadata: Metadata = {
  title: 'FrigoChef — Turn your fridge into dinner',
  description: 'Scan your fridge, track freshness and get AI recipes from what you already have.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-[#0a0a0a] font-sans text-neutral-100 antialiased selection:bg-emerald-500/30">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
