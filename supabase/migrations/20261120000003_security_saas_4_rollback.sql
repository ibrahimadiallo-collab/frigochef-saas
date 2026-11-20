-- ============================================================================
-- SAFE ROLLBACK: 20261120000003_security_saas_4_rollback.sql
-- DESCRIZIONE: Rollback NON DISTRUTTIVO della migrazione security_saas_4.
-- ============================================================================

BEGIN;

-- Preserva tutte le colonne dati e mantiene le funzioni di sicurezza attive.
SELECT 1;

COMMIT;
