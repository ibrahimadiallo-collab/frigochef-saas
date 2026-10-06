import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Nota: nessun secret qui. Solo le variabili NEXT_PUBLIC_* arrivano al browser.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  eslint: {
    // Il lint gira in CI / `npm run lint`; non blocca il deploy Vercel.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // La build ora fallisce sugli errori di tipo (prima venivano ignorati).
    ignoreBuildErrors: false,
  },
  async redirects() {
    return [
      { source: "/app", destination: "/dashboard", permanent: false },
      { source: "/app/:path*", destination: "/:path*", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
