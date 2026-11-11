import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={inter.variable}>
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
