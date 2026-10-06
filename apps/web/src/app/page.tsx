import Link from 'next/link';
import { Camera, CalendarDays, ChefHat, Check, Leaf, Package, Radar, Sparkles } from 'lucide-react';
import { MarketingNav } from '@/components/layout/MarketingNav';
import { Reveal } from '@/components/landing/Reveal';
import { buttonClasses } from '@/components/ui/Button';
import { TrackView } from '@/components/landing/TrackView';
import { FREE_LIMITS, PRO_PRICE_LABEL } from '@/lib/pricing';

const FEATURES = [
  { id: 'vision', icon: Camera, title: 'Fridge Vision', text: 'Snap a photo of your fridge. AI detects every ingredient, its quantity and freshness in seconds.' },
  { id: 'pantry', icon: Package, title: 'Pantry Memory', text: 'Everything you scan is remembered. Edit, filter and track your pantry without spreadsheets.' },
  { id: 'radar', icon: Radar, title: 'Freshness Radar', text: 'See what expires first at a glance, so nothing gets forgotten in the back of the fridge.' },
  { id: 'recipes', icon: Sparkles, title: 'AI Recipes', text: 'Recipes built around what you already have, prioritizing ingredients that expire soon.' },
  { id: 'cook', icon: ChefHat, title: 'Cook Mode', text: 'Full-screen, step-by-step guidance with built-in timers. Hands busy? Just tap next.' },
  { id: 'plan', icon: CalendarDays, title: 'Meal Planning', text: 'A weekly plan generated from your pantry, with a shopping list for what is missing.' },
] as const;

const STATS = [
  { value: '30%', label: 'of food bought at home ends up wasted' },
  { value: '€250+', label: 'saved per household every year' },
  { value: '10s', label: 'from fridge photo to dinner idea' },
] as const;

const TESTIMONIALS = [
  { name: 'Giulia R.', role: 'Busy parent', quote: 'I open the fridge, take a photo and dinner is decided. We throw away way less food.' },
  { name: 'Marco T.', role: 'Student', quote: 'The freshness radar alone paid for itself. My groceries finally get used.' },
  { name: 'Sara L.', role: 'Home cook', quote: 'Cook Mode with timers is fantastic. It feels like having a chef next to me.' },
] as const;

const PLANS = [
  { name: 'Free', price: '€0', features: [`${FREE_LIMITS.scansPerMonth} fridge scans per month`, 'Pantry tracking', 'Freshness Radar', '1 AI meal plan'], cta: 'Start free', highlighted: false },
  { name: 'Pro', price: PRO_PRICE_LABEL, features: ['Unlimited scans', 'Unlimited AI recipes', 'Weekly meal planning', 'Cook Mode with timers', 'Priority AI models'], cta: 'Go Pro', highlighted: true },
] as const;

const FAQS = [
  { q: 'How does Fridge Vision work?', a: 'You upload a photo and our vision AI identifies the ingredients, estimates quantities and suggests expiry dates. You confirm before anything is saved.' },
  { q: 'Is my data private?', a: 'Yes. Your pantry and recipes are protected by row-level security and are only visible to you unless you choose to share a recipe.' },
  { q: 'Do I need to type ingredients manually?', a: 'No. Scanning is the fastest way, but you can always add or edit items manually in your pantry.' },
  { q: 'Can I cancel Pro anytime?', a: 'Absolutely. You can cancel at any time and keep Pro features until the end of your billing period.' },
  { q: 'Does it handle dietary preferences?', a: 'Yes. Set your preferences in your profile and recipes will respect them.' },
  { q: 'Which devices are supported?', a: 'FrigoChef works in any modern browser on phone, tablet and desktop.' },
] as const;

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-white/60">{text}</p>}
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0a0a0a] text-white">
      <TrackView />
      <MarketingNav />

      {/* 1. Hero */}
      <section className="relative px-4 pb-24 pt-20 sm:px-6 sm:pt-28">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
        <Reveal className="relative mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <Leaf className="h-3.5 w-3.5" /> Cook more, waste less
          </span>
          <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl">Turn your fridge into dinner.</h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/60">
            Scan what you have, track what expires, and get AI recipes that use it up — in seconds.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/scan" className={buttonClasses('primary', 'lg')}>Scan My Fridge</Link>
            <a href="#features" className={buttonClasses('secondary', 'lg')}>See how it works</a>
          </div>
        </Reveal>
      </section>

      {/* 2-7. Features: Fridge Vision, Pantry Memory, Freshness Radar, AI Recipes, Cook Mode, Meal Planning */}
      <section id="features" className="px-4 py-24 sm:px-6">
        <SectionTitle eyebrow="Features" title="Your whole kitchen, finally organized" />
        <div className="mx-auto mt-14 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.id} delay={i * 0.05}>
              <article id={f.id} className="h-full rounded-3xl border border-white/10 bg-[#111827] p-6 transition-colors hover:border-emerald-500/40">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{f.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 8. Food waste stats */}
      <section className="px-4 py-24 sm:px-6">
        <SectionTitle eyebrow="Food waste" title="Small habits, big impact" />
        <div className="mx-auto mt-14 grid max-w-5xl gap-6 sm:grid-cols-3">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08} className="rounded-3xl border border-white/10 bg-[#111827] p-8 text-center">
              <p className="text-4xl font-bold text-emerald-400">{s.value}</p>
              <p className="mt-2 text-sm text-white/60">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 9. Testimonials */}
      <section className="px-4 py-24 sm:px-6">
        <SectionTitle eyebrow="Testimonials" title="Loved by home cooks" />
        <div className="mx-auto mt-14 grid max-w-6xl gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <figure className="h-full rounded-3xl border border-white/10 bg-[#111827] p-6">
                <blockquote className="text-white/80">&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className="mt-5 text-sm">
                  <span className="font-semibold">{t.name}</span> <span className="text-white/50">· {t.role}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 10. Pricing */}
      <section id="pricing" className="px-4 py-24 sm:px-6">
        <SectionTitle eyebrow="Pricing" title="Simple pricing" text="Start free. Upgrade when FrigoChef becomes part of your routine." />
        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
          {PLANS.map((p) => (
            <Reveal key={p.name}>
              <div className={`h-full rounded-3xl border p-8 ${p.highlighted ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-white/10 bg-[#111827]'}`}>
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="mt-4 text-4xl font-bold">
                  {p.price}<span className="text-base font-normal text-white/50">/month</span>
                </p>
                <ul className="mt-6 space-y-3 text-sm text-white/70">
                  {p.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" /> {feat}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className={`${buttonClasses(p.highlighted ? 'primary' : 'secondary', 'lg')} mt-8 w-full`}>
                  {p.cta}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 11. FAQ */}
      <section id="faq" className="px-4 py-24 sm:px-6">
        <SectionTitle eyebrow="FAQ" title="Questions, answered" />
        <div className="mx-auto mt-14 max-w-3xl space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-white/10 bg-[#111827] p-5">
              <summary className="cursor-pointer list-none font-medium marker:hidden">{f.q}</summary>
              <p className="mt-3 text-sm text-white/60">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 12. Final CTA */}
      <section className="px-4 py-24 sm:px-6">
        <Reveal className="mx-auto max-w-4xl rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-transparent p-10 text-center sm:p-16">
          <h2 className="text-3xl font-bold sm:text-4xl">Start cooking smarter</h2>
          <p className="mx-auto mt-4 max-w-lg text-white/60">Your next dinner is already in your fridge. Let FrigoChef find it.</p>
          <Link href="/signup" className={`${buttonClasses('primary', 'lg')} mt-8`}>Create free account</Link>
        </Reveal>
      </section>

      <footer className="border-t border-white/5 py-10 text-center text-xs text-white/40">
        © {new Date().getFullYear()} FrigoChef. All rights reserved.
      </footer>
    </main>
  );
}
