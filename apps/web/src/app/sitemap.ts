import type { MetadataRoute } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://frigochef.app';
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/signup`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
  ];

  // Ricette pubbliche condivise (se il service role è configurato).
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data } = await admin
      .from('recipes')
      .select('id, created_at')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(1000);
    for (const r of (data ?? []) as { id: string; created_at: string | null }[]) {
      entries.push({
        url: `${baseUrl}/recipe/${r.id}`,
        lastModified: r.created_at ? new Date(r.created_at) : now,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  }
  return entries;
}
