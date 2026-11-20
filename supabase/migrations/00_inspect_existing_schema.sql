-- ============================================================================
-- STEP 0 (SOLA LETTURA): 00_inspect_existing_schema.sql
-- DESCRIZIONE: Esegui questa query nel SQL Editor di Supabase PRIMA di
-- applicare le migrazioni per verificare lo stato attuale di tabelle,
-- colonne, policy RLS, trigger e funzioni RPC senza modificare alcun dato.
--
-- Ordine corretto di esecuzione su un database esistente:
--   1. 00_inspect_existing_schema.sql           (verifica sola lettura)
--   2. 20261120000001_security_saas_2.sql       (migrazione 1: colonne, RLS, consume_ai_quota)
--   3. 20261120000002_security_saas_3.sql       (migrazione 2: locked_at, claim_stripe_webhook_event)
-- ============================================================================

-- A) Tabelle presenti nello schema public e stato RLS
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;

-- B) Colonne attuali della tabella public.profiles
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- C) Funzioni RPC e Trigger di sicurezza presenti nello schema public
SELECT
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE specific_schema = 'public'
  AND routine_name IN (
    'consume_ai_quota',
    'claim_stripe_webhook_event',
    'prevent_profile_privilege_escalation',
    'handle_new_user'
  )
ORDER BY routine_name;
