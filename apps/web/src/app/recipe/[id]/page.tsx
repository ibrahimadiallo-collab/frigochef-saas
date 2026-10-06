import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { RECIPE_COLUMNS, rowToRecipe } from '@/lib/recipes';
import { MarketingNav } from '@/components/layout/MarketingNav';
import RecipeCard from '@/components/RecipeCard';
import { buttonClasses } from '@/components/ui/Button';
import type { Recipe, RecipeRow } from '@/types';

export const dynamic = 'force-dynamic';

interface RecipePageProps {
  params: Promise<{ id: string }>;
}

async function getPublicRecipe(id: string): Promise<Recipe | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin
    .from('recipes')
    .select(RECIPE_COLUMNS)
    .eq('id', id)
    .eq('is_public', true)
    .maybeSingle();
  if (error || !data) return null;
  return rowToRecipe(data as unknown as RecipeRow);
}

export async function generateMetadata({ params }: RecipePageProps): Promise<Metadata> {
  const { id } = await params;
  const recipe = await getPublicRecipe(id);
  if (!recipe) return { title: 'Recipe not found', robots: { index: false } };
  const description = recipe.description || `Cook ${recipe.title} with FrigoChef, the AI kitchen assistant.`;
  const images = recipe.imageUrl ? [{ url: recipe.imageUrl, alt: recipe.title }] : undefined;
  return {
    title: { absolute: `${recipe.title} Recipe | FrigoChef` },
    description,
    alternates: { canonical: `/recipe/${id}` },
    openGraph: { title: `${recipe.title} — FrigoChef AI Recipe`, description, type: 'article', siteName: 'FrigoChef', images },
    twitter: { card: 'summary_large_image', title: `${recipe.title} — FrigoChef AI Recipe`, description, images: images?.map((i) => i.url) },
  };
}

export default async function PublicRecipePage({ params }: RecipePageProps) {
  const { id } = await params;
  const recipe = await getPublicRecipe(id);
  if (!recipe) notFound();

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <MarketingNav />
      <div className="mx-auto max-w-4xl space-y-10 px-4 py-12 sm:px-6">
        <RecipeCard recipe={recipe} />
        <div className="rounded-3xl border border-white/10 bg-[#111827] p-8 text-center">
          <h2 className="text-2xl font-bold">Want to cook with what you have?</h2>
          <p className="mx-auto mt-2 max-w-md text-white/60">
            Scan your fridge and get recipes built around your real ingredients.
          </p>
          <Link href="/signup" className={`${buttonClasses('primary', 'lg')} mt-6`}>
            Start cooking smarter
          </Link>
        </div>
      </div>
    </main>
  );
}
