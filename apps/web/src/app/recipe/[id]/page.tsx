import { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Navbar from '@/components/Navbar';
import RecipeCard from '@/components/RecipeCard';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface RecipePageProps {
  params: Promise<{ id: string }>;
}

async function getRecipe(id: string) {
  const { data, error } = await supabaseAdmin
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data;
}

export async function generateMetadata({ params }: RecipePageProps): Promise<Metadata> {
  const { id } = await params;
  const recipe = await getRecipe(id);

  if (!recipe) return { title: 'Ricetta non trovata | FrigoChef' };

  const data = recipe.recipe_data;
  return {
    title: `${data.nome} | Ricetta AI di FrigoChef`,
    description: `Prepara ${data.nome} in ${data.tempo}. Scopri questa ricetta creata con FrigoChef.`,
    openGraph: {
      title: data.nome,
      description: `Ricetta intelligente per ${data.nome} creata con FrigoChef.`,
      type: 'article',
      siteName: 'FrigoChef',
    },
    twitter: {
      card: 'summary_large_image',
      title: data.nome,
      description: `Cucina ${data.nome} con FrigoChef AI.`,
    },
  };
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { id } = await params;
  const recipe = await getRecipe(id);

  if (!recipe) notFound();

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--fc-cream)' }}>
      <Navbar />

      <div style={{ maxWidth: 920, margin: '0 auto', width: '100%', padding: '40px 24px 80px', display: 'flex', flexDirection: 'column', gap: 32 }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--fc-sage)',
            textDecoration: 'none',
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
          }}
        >
          <ArrowLeft size={14} />
          Torna alla Dashboard
        </Link>

        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 14px',
              borderRadius: 999,
              background: 'rgba(217,233,163,0.5)',
              border: '1px solid rgba(217,233,163,0.9)',
              marginBottom: 12,
            }}
          >
            <Sparkles size={12} style={{ color: 'var(--fc-forest)' }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--fc-forest)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              Ricetta Condivisa
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 800, color: 'var(--fc-forest)', letterSpacing: '-0.03em' }}>
            {recipe.recipe_data.nome}
          </h1>
        </div>

        <RecipeCard recipe={{ ...recipe.recipe_data, id: recipe.id }} />

        <div
          className="fc-card"
          style={{
            padding: '40px 32px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            background: 'linear-gradient(135deg, rgba(23,76,60,0.04) 0%, rgba(217,233,163,0.15) 100%)',
          }}
        >
          <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--fc-forest)' }}>
            Vuoi cucinare con quello che hai già in frigo?
          </h3>
          <p style={{ fontSize: 14, color: 'var(--fc-sage)', maxWidth: 420, lineHeight: 1.6 }}>
            Unisciti a chi riduce gli sprechi alimentari e organizza i pasti in modo intelligente con FrigoChef.
          </p>
          <Link
            href="/"
            className="fc-btn-primary"
            style={{ textDecoration: 'none', marginTop: 6, display: 'inline-block' }}
          >
            Inizia Gratis Ora
          </Link>
        </div>
      </div>
    </main>
  );
}
