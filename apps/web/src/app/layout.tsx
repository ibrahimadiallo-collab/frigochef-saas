import type { Metadata } from "next";
import "./globals.css";

// Rimosso next/font/google per evitare errori di build dovuti alla connessione di rete
// che impedisce il download dei font durante la compilazione.
// Utilizzeremo font di sistema premium (Inter, Satoshi fallback).

export const metadata: Metadata = {
  title: "FrigoChef — The AI Kitchen Assistant",
  description: "Turn your fridge into dinner with high-end AI recipe generation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="antialiased bg-[#020202] text-[#f5f5f5] font-sans">
        {children}
      </body>
    </html>
  );
}
