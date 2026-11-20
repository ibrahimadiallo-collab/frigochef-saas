-- ============================================================================
-- STEP 0 (SOLA LETTURA): 00_inspect_existing_schema.sql
-- DESCRIZIONE (Passo 8): Ispezione completa in sola lettura di:
-- A) Tabelle e stato RLS (relrowsecurity)
-- B) Policy RLS effettivamente attive (pg_policies: nome, comando, USING, WITH CHECK)
-- C) Colonne e vincoli FK di public.profiles (incluso ON DELETE su referred_by)
-- D) Trigger collegati alle tabelle (pg_trigger su public.profiles e auth.users, tgenabled)
-- E) Funzioni SECURITY DEFINER, search_path (proconfig) e permessi has_function_privilege per anon/authenticated
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

-- B) Policy RLS attive (pg_policies)
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- C) Colonne di public.profiles e vincolo FK su referred_by (confdeltype: 'n' = SET NULL, 'a' = NO ACTION)
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

SELECT
  con.conname AS constraint_name,
  con.confdeltype AS on_delete_action,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'profiles';

-- D) Trigger collegati a public.profiles e auth.users (pg_trigger)
SELECT
  n.nspname AS table_schema,
  c.relname AS table_name,
  t.tgname AS trigger_name,
  t.tgenabled AS trigger_enabled,
  p.proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal
  AND (
    (n.nspname = 'public' AND c.relname = 'profiles')
    OR (n.nspname = 'auth' AND c.relname = 'users')
  )
ORDER BY n.nspname, c.relname, t.tgname;

-- E) Verifica SECURITY DEFINER (prosecdef), search_path (proconfig) e permessi di esecuzione RPC (anon / authenticated)
SELECT
  p.proname AS function_name,
  p.prosecdef AS is_security_definer,
  p.proconfig AS function_config_search_path,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'consume_ai_quota',
    'claim_stripe_webhook_event',
    'prevent_profile_privilege_escalation',
    'handle_new_user'
  )
ORDER BY p.proname;
