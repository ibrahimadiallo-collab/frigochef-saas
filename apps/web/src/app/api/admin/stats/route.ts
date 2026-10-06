import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { jsonError, serverError, unauthorized } from '@/lib/api';
import { PRO_PRICE_EUR } from '@/lib/pricing';
import { activationRate, d1Retention, type AdminStats, type CohortEvent, type CohortUser } from '@/lib/admin/stats';

export const dynamic = 'force-dynamic';

const DAY = 24 * 60 * 60 * 1000;
const COHORT_EVENT_CAP = 50_000;

export async function GET(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return unauthorized();

    // is_admin è protetto dal trigger: l'utente non può auto-promuoversi.
    const { data: me } = await auth.supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', auth.user.id)
      .maybeSingle<{ is_admin: boolean | null }>();
    if (!me?.is_admin) return jsonError('Admin access required.', 403);

    const admin = getSupabaseAdmin();
    if (!admin) return jsonError('Admin analytics require SUPABASE_SERVICE_ROLE_KEY.', 503);

    const now = Date.now();
    const dayAgo = new Date(now - DAY).toISOString();
    const monthAgo = new Date(now - 30 * DAY).toISOString();
    const countEvents = (event: string, since?: string) => {
      let q = admin.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event', event);
      if (since) q = q.gte('created_at', since);
      return q;
    };

    const [usersTotal, usersToday, scansTotal, scansToday, recipes, cooks, conversions, proUsers, recent, cohortRes] = await Promise.all([
      admin.from('profiles').select('id', { count: 'exact', head: true }),
      admin.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', dayAgo),
      countEvents('scan_completed'),
      countEvents('scan_completed', dayAgo),
      countEvents('recipe_generated'),
      countEvents('cook_mode_completed'),
      countEvents('subscription_started'),
      admin.from('profiles').select('id', { count: 'exact', head: true }).eq('is_pro', true),
      admin.from('analytics_events').select('id, event, created_at, user_id').order('created_at', { ascending: false }).limit(20),
      admin.from('profiles').select('id, created_at').gte('created_at', monthAgo).limit(5000),
    ]);

    const cohort = (cohortRes.data ?? []) as CohortUser[];
    let cohortEvents: CohortEvent[] = [];
    if (cohort.length) {
      const { data } = await admin
        .from('analytics_events')
        .select('user_id, event, created_at')
        .in('user_id', cohort.map((u) => u.id))
        .gte('created_at', monthAgo)
        .limit(COHORT_EVENT_CAP);
      cohortEvents = (data ?? []) as CohortEvent[];
    }

    const pro = proUsers.count ?? 0;
    const body: AdminStats = {
      users: { total: usersTotal.count ?? 0, today: usersToday.count ?? 0 },
      scans: { total: scansTotal.count ?? 0, today: scansToday.count ?? 0 },
      recipesGenerated: recipes.count ?? 0,
      cookModeCompletions: cooks.count ?? 0,
      proConversions: conversions.count ?? 0,
      proUsers: pro,
      mrr: Math.round(pro * PRO_PRICE_EUR * 100) / 100,
      activationRate: activationRate(cohort, cohortEvents),
      d1Retention: d1Retention(cohort, cohortEvents, now),
      recentEvents: ((recent.data ?? []) as { id: string; event: string; created_at: string; user_id: string | null }[]).map((e) => ({
        id: e.id,
        event: e.event,
        createdAt: e.created_at,
        userId: e.user_id,
      })),
      generatedAt: new Date(now).toISOString(),
    };
    return NextResponse.json(body);
  } catch (error) {
    return serverError('admin-stats', error, 'Could not load admin stats.');
  }
}
