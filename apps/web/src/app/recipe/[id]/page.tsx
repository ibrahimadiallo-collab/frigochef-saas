import { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Navbar from '@/components/Navbar';
import RecipeCard from '@/components/RecipeCard';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

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

  if (!recipe) return { title: 'Recipe Not Found | FrigoChef' };

  const data = recipe.recipe_data;
  return {
    title: `${data.nome} | AI Recipe by FrigoChef`,
    description: `Cook ${data.nome} in ${data.tempo}. Discover this AI-generated recipe on FrigoChef.`,
    openGraph: {
      title: data.nome,
      description: `Delicious AI-powered recipe for ${data.nome}.`,
      type: 'article',
      siteName: 'FrigoChef',
    },
    twitter: {
      card: 'summary_large_image',
      title: data.nome,
      description: `Cook ${data.nome} with FrigoChef AI.`,
    }
  };
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { id } = await params;
  const recipe = await getRecipe(id);

  if (!recipe) notFound();

  return (
    <main className="min-h-screen flex flex-col bg-[#020202] text-white overflow-x-hidden">
      <Navbar />
      
      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-20 md:py-32 relative">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] pointer-events-none" />

        <div className="space-y-12">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-white/40 hover:text-emerald-500 transition-colors text-[10px] font-bold uppercase tracking-widest group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold tracking-widest uppercase border border-emerald-500/20">
              <Sparkles size={12} /> Public Masterpiece
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter">
              Shared Recipe
            </h1>
          </div>

          <div className="animate-in fade-in zoom-in-95 duration-700">
            <RecipeCard recipe={recipe.recipe_data} />
          </div>

          <div className="p-12 bg-white/[0.02] border border-white/5 rounded-[40px] text-center space-y-6">
            <h3 className="text-2xl font-bold">Want to cook with what you have?</h3>
            <p className="text-white/40 max-w-md mx-auto">
              Join thousands of users who are reducing food waste and cooking smarter with FrigoChef AI.
            </p>
            <Link 
              href="/"
              className="inline-flex h-16 px-10 bg-white text-black rounded-2xl font-bold items-center justify-center hover:bg-emerald-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Start Generating for Free
            </Link>
          </div>
        </div>
      </div>

      <footer className="border-t border-white/5 py-12 bg-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 text-center text-white/20 text-[10px] font-bold uppercase tracking-[0.3em]">
          © 2025 FRIGOCHEF • THE AI KITCHEN OPERATING SYSTEM
        </div>
      </footer>
    </main>
  );
}
