import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F6EF" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1512" },
  ],
};

export const metadata: Metadata = {
  title: "FrigoChef — La Tua Cucina, Più Intelligente",
  description:
    "FrigoChef trasforma gli ingredienti del tuo frigorifero in ricette deliziose. Gestisci la dispensa, pianifica i pasti e riduci gli sprechi alimentari con l'AI.",
  keywords: [
    "ricette frigorifero",
    "cosa cucinare oggi",
    "pianificatore pasti",
    "ridurre sprechi alimentari",
    "assistente cucina AI",
    "gestione dispensa",
  ],
  authors: [{ name: "FrigoChef" }],
  manifest: "/manifest.json",
  openGraph: {
    title: "FrigoChef — La Tua Cucina, Più Intelligente",
    description:
      "Trasforma gli ingredienti del tuo frigo in ricette straordinarie con l'AI.",
    type: "website",
    locale: "it_IT",
    siteName: "FrigoChef",
  },
  twitter: {
    card: "summary_large_image",
    title: "FrigoChef — La Tua Cucina, Più Intelligente",
    description:
      "Trasforma gli ingredienti del tuo frigo in ricette straordinarie con l'AI.",
  },
};

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('fc-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}else{document.documentElement.removeAttribute('data-theme');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className="antialiased"
        style={{
          backgroundColor: "var(--fc-cream)",
          color: "var(--fc-charcoal)",
          fontFamily: "var(--font-sans)",
        }}
      >
        {children}
      </body>
    </html>
  );
}
