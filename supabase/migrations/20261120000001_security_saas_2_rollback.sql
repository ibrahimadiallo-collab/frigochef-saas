-- ============================================================================
-- SAFE ROLLBACK: 20261120000001_security_saas_2_rollback.sql
-- DESCRIZIONE: Rollback NON DISTRUTTIVO (ALTO 4).
-- Rimuove esclusivamente le funzioni procedurali e i trigger introdotti dalla
-- migrazione security_saas_2, SENZA MAI eseguire DROP COLUMN o DROP TABLE
-- su tabelle contenenti dati degli utenti o informazioni sugli abbonamenti.
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.consume_ai_quota(UUID, TEXT, TEXT);
DROP TRIGGER IF EXISTS trg_prevent_profile_escalation ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_profile_privilege_escalation();

-- NOTA DI SICUREZZA (ALTO 4):
-- Le colonne di `public.profiles` (stripe_subscription_id, subscription_status,
-- subscription_plan, subscription_period_end, trial_used, dietary_preferences,
-- allergens, updated_at) e `public.pantry` (items_detail) vengono preservate
-- intenzionalmente per garantire zero perdita di dati preesistenti o di fatturazione.

COMMIT;
