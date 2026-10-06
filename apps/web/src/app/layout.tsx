import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { CookieBanner } from '@/components/ui/CookieBanner';

// Font di sistema (niente next/font/google per evitare download di rete in build).

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://frigochef.app';
const TITLE = 'FrigoChef — Turn your fridge into dinner';
const SHORT_DESCRIPTION = 'AI-powered kitchen assistant. Scan your fridge, track freshness, generate recipes.';

// L'immagine OG/Twitter è generata da app/opengraph-image.tsx e app/twitter-image.tsx (file convention).
export const metadata: Metadata = {
  title: { default: TITLE, template: '%s | FrigoChef' },
  description:
    'FrigoChef uses AI to scan your fridge, track ingredient freshness, and generate personalized recipes. Stop wasting food — start cooking smarter.',
  keywords: ['AI recipes', 'fridge scanner', 'meal planning', 'food waste', 'ingredient tracker', 'cook assistant'],
  authors: [{ name: 'FrigoChef' }],
  creator: 'FrigoChef',
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
    title: TITLE,
    description: SHORT_DESCRIPTION,
    siteName: 'FrigoChef',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: SHORT_DESCRIPTION,
    creator: '@frigochef',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/favicon.ico' }, { url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/apple-icon.png' }],
  },
  appleWebApp: { capable: true, title: 'FrigoChef', statusBarStyle: 'black-translucent' },
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
        <ToastProvider>
          {children}
          <CookieBanner />
        </ToastProvider>
      </body>
    </html>
  );
}
