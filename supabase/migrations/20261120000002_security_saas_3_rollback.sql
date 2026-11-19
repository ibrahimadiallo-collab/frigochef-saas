-- ============================================================================
-- SAFE ROLLBACK: 20261120000002_security_saas_3_rollback.sql
-- DESCRIZIONE: Rollback NON DISTRUTTIVO della migrazione security_saas_3.
-- Rimuove la funzione RPC `claim_stripe_webhook_event` preservando intatto
-- lo storico degli eventi elaborati in `public.stripe_webhook_events`.
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.claim_stripe_webhook_event(TEXT, TEXT, INTEGER);

COMMIT;
