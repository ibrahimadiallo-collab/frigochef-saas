'use client';

import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

/** Chiave localStorage della preferenza cookie (vedi CookieBanner). */
export const COOKIE_CONSENT_KEY = 'fc_cookie_consent';
export type CookieConsent = 'accepted' | 'declined';

export function getCookieConsent(): CookieConsent | null {
  try {
    const value = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    return value === 'accepted' || value === 'declined' ? value : null;
  } catch {
    return null;
  }
}

/** Eventi di prodotto tracciati nella tabella `analytics_events`. */
export const EVENTS = {
  LANDING_VIEW: 'landing_view',
  SIGNUP: 'signup',
  SCAN_STARTED: 'scan_started',
  SCAN_COMPLETED: 'scan_completed',
  INGREDIENTS_CONFIRMED: 'ingredients_confirmed',
  RECIPE_GENERATED: 'recipe_generated',
  RECIPE_OPENED: 'recipe_opened',
  COOK_MODE_STARTED: 'cook_mode_started',
  COOK_MODE_COMPLETED: 'cook_mode_completed',
  INGREDIENT_ADDED: 'ingredient_added',
  MEAL_PLAN_CREATED: 'meal_plan_created',
  SHOPPING_LIST_CREATED: 'shopping_list_created',
  REFERRAL_SHARED: 'referral_shared',
  SUBSCRIPTION_STARTED: 'subscription_started',
} as const;

export type AnalyticsEvent = (typeof EVENTS)[keyof typeof EVENTS];

/**
 * Fire-and-forget: non lancia mai e non blocca la UI.
 * Usa la sessione corrente se presente, altrimenti registra un evento anonimo.
 */
export function trackEvent(event: AnalyticsEvent, properties: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined' || !isSupabaseConfigured()) return;
  // L'utente ha rifiutato i cookie analitici: nessun tracciamento.
  if (getCookieConsent() === 'declined') return;
  void (async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      await supabase
        .from('analytics_events')
        .insert({ event, properties, user_id: data.session?.user.id ?? null });
    } catch {
      // Ignorato di proposito: l'analytics non deve mai interferire con l'esperienza.
    }
  })();
}
