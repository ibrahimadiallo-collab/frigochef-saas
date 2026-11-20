-- ============================================================================
-- MIGRATION: 20261120000003_security_saas_4.sql
-- DESCRIZIONE (Passo 3):
-- 1. Vincolo `referred_by` con `ON DELETE SET NULL` (consente cancellazione GDPR a chi ha invitato altri)
-- 2. `handle_new_user()` valida `referred_by` prima dell'INSERT (un codice invito errato non blocca la registrazione)
-- 3. `referred_by` e `stripe_last_event_created` protetti nel trigger `prevent_profile_privilege_escalation()`
-- 4. `SET search_path = public, pg_temp` su tutte le 4 funzioni `SECURITY DEFINER`
-- 5. Pulizia automatica `ip_hash` dopo 30 giorni (data retention GDPR)
-- ============================================================================

BEGIN;

-- 1. Colonna per ordinamento eventi webhook Stripe (ignora eventi fuori ordine più vecchi)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_last_event_created BIGINT DEFAULT 0 NOT NULL;

-- 2. Ricrea il vincolo FK su referred_by con ON DELETE SET NULL
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_referred_by_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_referred_by_fkey
  FOREIGN KEY (referred_by)
  REFERENCES public.profiles(referral_code)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

-- 3. Trigger anti-escalation con protezione anche su referred_by e stripe_last_event_created + SET search_path
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') = 'authenticated'
     OR COALESCE(auth.role(), '') = 'authenticated' THEN
    IF NEW.is_pro IS DISTINCT FROM OLD.is_pro
       OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
       OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
       OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
       OR NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
       OR NEW.subscription_period_end IS DISTINCT FROM OLD.subscription_period_end
       OR NEW.trial_used IS DISTINCT FROM OLD.trial_used
       OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
       OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
       OR NEW.stripe_last_event_created IS DISTINCT FROM OLD.stripe_last_event_created
       OR NEW.email IS DISTINCT FROM OLD.email
    THEN
      RAISE EXCEPTION 'Operazione non consentita: i campi di abbonamento e referral possono essere modificati solo dal server.';
    END IF;
  END IF;
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 4. Creazione profilo alla registrazione: valida referred_by (ignora codici inesistenti invece di fallire)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_raw_ref TEXT;
  v_valid_ref TEXT := NULL;
BEGIN
  v_raw_ref := NULLIF(BTRIM(new.raw_user_meta_data->>'referred_by'), '');
  IF v_raw_ref IS NOT NULL THEN
    SELECT referral_code INTO v_valid_ref
    FROM public.profiles
    WHERE referral_code = v_raw_ref
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, email, referred_by, referral_code)
  VALUES (
    new.id,
    new.email,
    v_valid_ref,
    UPPER(SUBSTRING(MD5(new.id::text || clock_timestamp()::text) FROM 1 FOR 8))
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Funzione RPC Atomica consume_ai_quota con SET search_path e pulizia ip_hash > 30 giorni
CREATE OR REPLACE FUNCTION public.consume_ai_quota(
  p_user_id UUID,
  p_action_type TEXT,
  p_ip_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_pro BOOLEAN := FALSE;
  v_period_end TIMESTAMP WITH TIME ZONE;
  v_since TIMESTAMP WITH TIME ZONE;
  v_limit INTEGER;
  v_used INTEGER;
  v_now TIMESTAMP WITH TIME ZONE := timezone('utc'::text, now());
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'is_pro', false,
      'used', 0,
      'limit', 0,
      'remaining', 0,
      'error_code', 'UNAUTHENTICATED'
    );
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || ':' || p_action_type));

  -- Data retention GDPR: anonimizza ip_hash più vecchi di 30 giorni
  UPDATE public.ai_usage_logs
  SET ip_hash = NULL
  WHERE ip_hash IS NOT NULL
    AND created_at < (v_now - interval '30 days');

  SELECT is_pro, subscription_period_end
  INTO v_is_pro, v_period_end
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_is_pro IS TRUE AND v_period_end IS NOT NULL AND v_period_end <= v_now THEN
    v_is_pro := FALSE;
  END IF;
  v_is_pro := COALESCE(v_is_pro, FALSE);

  IF p_action_type = 'recipe' THEN
    v_since := date_trunc('day', v_now);
    v_limit := CASE WHEN v_is_pro THEN 50 ELSE 3 END;
  ELSIF p_action_type = 'vision' THEN
    v_since := date_trunc('month', v_now);
    v_limit := CASE WHEN v_is_pro THEN 50 ELSE 3 END;
  ELSIF p_action_type = 'meal_plan' THEN
    v_since := date_trunc('month', v_now);
    v_limit := CASE WHEN v_is_pro THEN 4 ELSE 1 END;
  ELSE
    RAISE EXCEPTION 'Tipo azione AI non valido: %', p_action_type;
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_used
  FROM public.ai_usage_logs
  WHERE user_id = p_user_id
    AND action_type = p_action_type
    AND created_at >= v_since;

  IF v_used >= v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'is_pro', v_is_pro,
      'used', v_used,
      'limit', v_limit,
      'remaining', 0,
      'error_code', 'QUOTA_EXCEEDED'
    );
  END IF;

  INSERT INTO public.ai_usage_logs (user_id, ip_hash, action_type)
  VALUES (p_user_id, p_ip_hash, p_action_type);

  RETURN jsonb_build_object(
    'allowed', true,
    'is_pro', v_is_pro,
    'used', v_used + 1,
    'limit', v_limit,
    'remaining', GREATEST(0, v_limit - (v_used + 1))
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_ai_quota(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- 6. Funzione RPC Atomica claim_stripe_webhook_event con SET search_path
CREATE OR REPLACE FUNCTION public.claim_stripe_webhook_event(
  p_event_id TEXT,
  p_event_type TEXT,
  p_lock_timeout_seconds INTEGER DEFAULT 300
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing_status TEXT;
  v_existing_locked_at TIMESTAMP WITH TIME ZONE;
  v_now TIMESTAMP WITH TIME ZONE := timezone('utc'::text, now());
  v_timeout_threshold TIMESTAMP WITH TIME ZONE := v_now - make_interval(secs => COALESCE(p_lock_timeout_seconds, 300));
BEGIN
  IF p_event_id IS NULL OR BTRIM(p_event_id) = '' THEN
    RETURN jsonb_build_object('action', 'HEALTHCHECK_OK', 'status', 'ready');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('stripe_evt:' || p_event_id));

  SELECT status, locked_at
  INTO v_existing_status, v_existing_locked_at
  FROM public.stripe_webhook_events
  WHERE event_id = p_event_id;

  IF NOT FOUND THEN
    INSERT INTO public.stripe_webhook_events (event_id, event_type, status, locked_at, processed_at)
    VALUES (p_event_id, p_event_type, 'processing', v_now, v_now);

    RETURN jsonb_build_object('action', 'CLAIMED', 'status', 'processing');
  END IF;

  IF v_existing_status = 'completed' THEN
    RETURN jsonb_build_object('action', 'ALREADY_COMPLETED', 'status', 'completed');
  END IF;

  IF v_existing_locked_at IS NULL OR v_existing_locked_at < v_timeout_threshold THEN
    UPDATE public.stripe_webhook_events
    SET status = 'processing',
        locked_at = v_now,
        event_type = p_event_type
    WHERE event_id = p_event_id;

    RETURN jsonb_build_object('action', 'RECLAIMED', 'status', 'processing');
  END IF;

  RETURN jsonb_build_object('action', 'IN_PROGRESS', 'status', 'processing');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_stripe_webhook_event(TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;

COMMIT;
