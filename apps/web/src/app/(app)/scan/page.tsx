'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, CheckCircle2, ImagePlus, Plus, RefreshCcw, ScanLine, Sparkles, Trash2, Refrigerator } from 'lucide-react';
import { INGREDIENT_CATEGORIES, type DetectedIngredient, type IngredientCategory } from '@/types';
import { apiFetch, errorMessage } from '@/lib/http';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { ErrorState } from '@/components/ui/ErrorState';
import { cn } from '@/lib/cn';

type Phase = 'select' | 'preview' | 'analyzing' | 'review' | 'success';

interface EditableIngredient extends DetectedIngredient {
  key: string;
}

const MAX_BYTES = 10 * 1024 * 1024;
let keySeq = 0;
const nextKey = () => `ing-${++keySeq}`;

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tone = value >= 0.8 ? 'bg-emerald-500' : value >= 0.5 ? 'bg-amber-400' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2" title={`AI confidence ${pct}%`}>
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/10">
        <motion.div className={cn('h-full rounded-full', tone)} initial={{ width: 0 }} animate={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 text-right text-[11px] tabular-nums text-white/40">{pct}%</span>
    </div>
  );
}

export default function ScanPage() {
  const [phase, setPhase] = useState<Phase>('select');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<EditableIngredient[]>([]);
  const [scanId, setScanId] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    e.target.value = '';
    if (!selected) return;
    if (!selected.type.startsWith('image/')) return setError('Please choose an image file (JPG, PNG, HEIC).');
    if (selected.size > MAX_BYTES) return setError('This photo is too large (max 10 MB).');
    setError(null);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setPhase('preview');
  }

  async function analyze() {
    if (!file) return;
    setError(null);
    setPhase('analyzing');
    try {
      const form = new FormData();
      form.append('image', file);
      const data = await apiFetch<{ ingredients: DetectedIngredient[]; scanId: string | null }>('/api/scan', {
        method: 'POST',
        body: form,
      });
      setIngredients(data.ingredients.map((i) => ({ ...i, key: nextKey() })));
      setScanId(data.scanId);
      setPhase('review');
    } catch (err) {
      setError(errorMessage(err));
      setPhase('preview');
    }
  }

  function update(key: string, patch: Partial<DetectedIngredient>) {
    setIngredients((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  function addBlank() {
    setIngredients((list) => [
      ...list,
      { key: nextKey(), name: '', quantity: null, unit: null, category: 'vegetable', confidence: 1 },
    ]);
  }

  async function confirm() {
    const valid = ingredients.filter((i) => i.name.trim());
    if (!valid.length) return setError('Add at least one ingredient before saving.');
    setError(null);
    setIsSaving(true);
    try {
      const data = await apiFetch<{ success: boolean; savedCount: number }>('/api/scan/confirm', {
        method: 'POST',
        body: JSON.stringify({
          scanId,
          ingredients: valid.map(({ name, quantity, unit, category, confidence }) => ({ name: name.trim(), quantity, unit, category, confidence })),
        }),
      });
      setSavedCount(data.savedCount);
      setPhase('success');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  function restart() {
    setFile(null);
    setPreviewUrl(null);
    setIngredients([]);
    setScanId(null);
    setError(null);
    setPhase('select');
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Scan your fridge" subtitle="Take a photo and let AI detect your ingredients." />

      <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />

      {error && phase !== 'review' && <div className="mb-4"><ErrorState message={error} /></div>}

      <AnimatePresence mode="wait">
        {phase === 'select' && (
          <motion.div key="select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="flex flex-col items-center gap-6 border-dashed px-6 py-14 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-400">
                <ScanLine className="h-10 w-10" aria-hidden />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-white">Open your fridge and snap a photo</h2>
                <p className="text-sm text-white/50">Good lighting and an open door give the best results.</p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Button size="lg" onClick={() => cameraRef.current?.click()}>
                  <Camera className="h-5 w-5" aria-hidden /> Take photo
                </Button>
                <Button size="lg" variant="secondary" onClick={() => uploadRef.current?.click()}>
                  <ImagePlus className="h-5 w-5" aria-hidden /> Upload image
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {(phase === 'preview' || phase === 'analyzing') && previewUrl && (
          <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <Card className="relative overflow-hidden">
              <div className="relative aspect-[4/3] w-full bg-black">
                <Image src={previewUrl} alt="Fridge preview" fill unoptimized className="object-contain" />
              </div>
              <AnimatePresence>
                {phase === 'analyzing' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-sm"
                  >
                    <motion.div
                      className="absolute inset-x-0 h-0.5 bg-emerald-400 shadow-[0_0_24px_4px_rgba(16,185,129,0.6)]"
                      initial={{ top: '0%' }}
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                    />
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}>
                      <Sparkles className="h-10 w-10 text-emerald-400" aria-hidden />
                    </motion.div>
                    <p className="text-base font-medium text-white" role="status">AI is analyzing your fridge...</p>
                    <p className="text-xs text-white/50">This usually takes 5–15 seconds</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="secondary" size="lg" onClick={restart} disabled={phase === 'analyzing'} className="sm:flex-1">
                <RefreshCcw className="h-5 w-5" aria-hidden /> Retake
              </Button>
              <Button size="lg" onClick={analyze} isLoading={phase === 'analyzing'} className="sm:flex-[2]">
                <Sparkles className="h-5 w-5" aria-hidden /> Analyze Fridge
              </Button>
            </div>
          </motion.div>
        )}

        {phase === 'review' && (
          <motion.div key="review" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {ingredients.length} ingredient{ingredients.length === 1 ? '' : 's'} detected
              </h2>
              <Button variant="ghost" size="sm" onClick={restart}><RefreshCcw className="h-4 w-4" aria-hidden /> New scan</Button>
            </div>
            <p className="text-sm text-white/50">Review the list: edit names or quantities, remove mistakes, add anything the AI missed.</p>

            {ingredients.length === 0 && (
              <Card className="px-6 py-8 text-center text-sm text-white/60">
                We couldn&apos;t spot any ingredients. Add them manually or try another photo.
              </Card>
            )}

            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {ingredients.map((ing) => (
                  <motion.li
                    key={ing.key}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                  >
                    <Card className="grid grid-cols-[1fr_auto] gap-2 p-3 sm:grid-cols-[1.6fr_0.6fr_0.6fr_1fr_auto_auto] sm:items-center">
                      <Input aria-label="Ingredient name" value={ing.name} placeholder="Ingredient name" onChange={(e) => update(ing.key, { name: e.target.value })} className="col-span-1 capitalize" />
                      <button type="button" onClick={() => setIngredients((l) => l.filter((i) => i.key !== ing.key))} aria-label={`Remove ${ing.name || 'ingredient'}`} className="flex h-11 w-11 items-center justify-center rounded-xl text-white/40 hover:bg-red-500/10 hover:text-red-400 sm:order-last">
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="col-span-2 grid grid-cols-3 gap-2 sm:col-span-1 sm:contents">
                        <Input aria-label="Quantity" inputMode="decimal" placeholder="Qty" value={ing.quantity ?? ''} onChange={(e) => update(ing.key, { quantity: e.target.value === '' ? null : Number(e.target.value) || 0 })} />
                        <Input aria-label="Unit" placeholder="Unit" value={ing.unit ?? ''} onChange={(e) => update(ing.key, { unit: e.target.value || null })} />
                        <Select aria-label="Category" value={ing.category} onChange={(e) => update(ing.key, { category: e.target.value as IngredientCategory })}>
                          {INGREDIENT_CATEGORIES.map((c) => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
                        </Select>
                      </div>
                      <div className="col-span-2 sm:col-span-1"><ConfidenceMeter value={ing.confidence} /></div>
                    </Card>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            <Button variant="secondary" onClick={addBlank} className="w-full border-dashed">
              <Plus className="h-4 w-4" aria-hidden /> Add ingredient
            </Button>

            {error && <ErrorState message={error} />}

            <Button size="lg" onClick={confirm} isLoading={isSaving} disabled={!ingredients.some((i) => i.name.trim())} className="w-full">
              <CheckCircle2 className="h-5 w-5" aria-hidden /> Confirm &amp; Save to Pantry
            </Button>
          </motion.div>
        )}

        {phase === 'success' && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="flex flex-col items-center gap-5 px-6 py-12 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 15 }}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-black"
              >
                <CheckCircle2 className="h-10 w-10" aria-hidden />
              </motion.div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-white">
                  {savedCount} ingredient{savedCount === 1 ? '' : 's'} saved to your pantry
                </h2>
                <p className="text-sm text-white/50">Freshness estimates were added automatically.</p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Link href="/recipes?generate=1" className={buttonClasses('primary', 'lg')}>
                  <Sparkles className="h-5 w-5" aria-hidden /> Generate Recipe
                </Link>
                <Link href="/pantry" className={buttonClasses('secondary', 'lg')}>
                  <Refrigerator className="h-5 w-5" aria-hidden /> View Pantry
                </Link>
              </div>
              <Button variant="ghost" size="sm" onClick={restart}>Scan again</Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
