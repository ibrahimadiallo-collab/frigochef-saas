/** Calcoli puri delle metriche admin (testabili senza DB). */
export interface AdminStats {
  users: { total: number; today: number };
  scans: { total: number; today: number };
  recipesGenerated: number;
  cookModeCompletions: number;
  proConversions: number;
  proUsers: number;
  mrr: number;
  /** % utenti (ultimi 30 giorni) che hanno completato almeno una scansione. */
  activationRate: number;
  /** % utenti (ultimi 30 giorni) attivi il giorno successivo all'iscrizione. */
  d1Retention: number;
  recentEvents: { id: string; event: string; createdAt: string; userId: string | null }[];
  generatedAt: string;
}

export interface CohortUser {
  id: string;
  created_at: string;
}

export interface CohortEvent {
  user_id: string | null;
  event: string;
  created_at: string;
}

const DAY = 24 * 60 * 60 * 1000;

function pct(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 1000) / 10;
}

export function activationRate(users: CohortUser[], events: CohortEvent[]): number {
  const activated = new Set(events.filter((e) => e.event === 'scan_completed' && e.user_id).map((e) => e.user_id));
  return pct(users.filter((u) => activated.has(u.id)).length, users.length);
}

/** D1: almeno un evento tra 24h e 48h dopo l'iscrizione. Esclude chi si è iscritto da meno di 48h. */
export function d1Retention(users: CohortUser[], events: CohortEvent[], now = Date.now()): number {
  const eligible = users.filter((u) => now - new Date(u.created_at).getTime() >= 2 * DAY);
  const byUser = new Map<string, number[]>();
  for (const e of events) {
    if (!e.user_id) continue;
    const list = byUser.get(e.user_id) ?? [];
    list.push(new Date(e.created_at).getTime());
    byUser.set(e.user_id, list);
  }
  const retained = eligible.filter((u) => {
    const start = new Date(u.created_at).getTime();
    return (byUser.get(u.id) ?? []).some((t) => t >= start + DAY && t < start + 2 * DAY);
  });
  return pct(retained.length, eligible.length);
}
