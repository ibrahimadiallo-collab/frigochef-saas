-- ============================================================================
-- ROLLBACK: 20261120000001_security_saas_2_rollback.sql
-- DESCRIZIONE: Procedura di rollback controllato per la migrazione security_saas_2
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.consume_ai_quota(UUID, TEXT, TEXT);
DROP TRIGGER IF EXISTS trg_prevent_profile_escalation ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_profile_privilege_escalation();

ALTER TABLE public.stripe_webhook_events
  DROP COLUMN IF EXISTS status;

ALTER TABLE public.pantry
  DROP COLUMN IF EXISTS items_detail;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS stripe_subscription_id,
  DROP COLUMN IF EXISTS subscription_status,
  DROP COLUMN IF EXISTS subscription_plan,
  DROP COLUMN IF EXISTS subscription_period_end,
  DROP COLUMN IF EXISTS trial_used,
  DROP COLUMN IF EXISTS dietary_preferences,
  DROP COLUMN IF EXISTS allergens,
  DROP COLUMN IF EXISTS updated_at;

COMMIT;
