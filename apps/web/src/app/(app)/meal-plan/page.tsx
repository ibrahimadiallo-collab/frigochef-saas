'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Sparkles } from 'lucide-react';
import type { MealPlan } from '@/types';
import { apiFetch, errorMessage } from '@/lib/http';
import MealPlanner from '@/components/MealPlanner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Spinner';

export default function MealPlanPage() {
  const [plan, setPlan] = useState<MealPlan | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setPlan(undefined);
    try {
      const data = await apiFetch<{ mealPlan: MealPlan | null }>('/api/meal-plan');
      setPlan(data.mealPlan);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function generate() {
    setIsGenerating(true);
    setError(null);
    try {
      const data = await apiFetch<{ mealPlan: MealPlan }>('/api/meal-plan', { method: 'POST', body: JSON.stringify({}) });
      setPlan(data.mealPlan);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  }

  const days = plan?.plan?.days ?? [];

  return (
    <div>
      <PageHeader
        title="Meal Plan"
        subtitle={plan ? `Week of ${new Date(plan.week_start).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}` : 'A low-waste week, planned from your pantry.'}
        action={
          <Button onClick={generate} isLoading={isGenerating}>
            {!isGenerating && <Sparkles className="h-4 w-4" aria-hidden />} {plan ? 'Regenerate plan' : 'Generate plan'}
          </Button>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={plan === undefined ? load : generate} />
      ) : plan === undefined || isGenerating ? (
        <Skeleton className="h-80" />
      ) : days.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No meal plan yet"
          description="Generate a 7-day plan that uses the ingredients you already have."
          action={<Button onClick={generate}><Sparkles className="h-4 w-4" aria-hidden /> Generate plan</Button>}
        />
      ) : (
        <MealPlanner days={days} />
      )}
    </div>
  );
}
