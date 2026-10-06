import type { MetadataRoute } from 'next';

// Le route dell'app autenticata sono alla radice (es. /dashboard), non sotto /app/.
const PRIVATE_PATHS = ['/api/', '/admin', '/dashboard', '/scan', '/pantry', '/recipes', '/meal-plan', '/shopping-list', '/profile', '/auth/'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: ['/', '/recipe/'], disallow: PRIVATE_PATHS }],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || 'https://frigochef.app'}/sitemap.xml`,
  };
}
