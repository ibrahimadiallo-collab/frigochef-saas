-- ============================================================================
-- MIGRATION: 20261120000001_security_saas_2.sql
-- DESCRIZIONE: Migrazione sicura e idempotente (ALTER TABLE + RLS + Atomic AI Quota RPC)
-- ============================================================================

BEGIN;

-- 1. AGGIORNAMENTO SICURO TABELLA ESISTENTE: public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  referral_code TEXT UNIQUE,
  referred_by TEXT REFERENCES public.profiles(referral_code),
  is_pro BOOLEAN DEFAULT FALSE NOT NULL,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free' NOT NULL,
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free' NOT NULL,
  ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS dietary_preferences JSONB DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS allergens JSONB DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger anti-privilege escalation su profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER AS $$
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
       OR NEW.email IS DISTINCT FROM OLD.email
    THEN
      RAISE EXCEPTION 'Operazione non consentita: i campi di abbonamento possono essere modificati solo dal server di fatturazione.';
    END IF;
  END IF;
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_profile_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();


-- 2. AGGIORNAMENTO SICURO TABELLA ESISTENTE: public.pantry
CREATE TABLE IF NOT EXISTS public.pantry (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  ingredients JSONB DEFAULT '[]'::jsonb NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id)
);

ALTER TABLE public.pantry
  ADD COLUMN IF NOT EXISTS items_detail JSONB DEFAULT '[]'::jsonb NOT NULL;

ALTER TABLE public.pantry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own pantry" ON public.pantry;
CREATE POLICY "Users can view their own pantry"
  ON public.pantry FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own pantry" ON public.pantry;
CREATE POLICY "Users can update their own pantry"
  ON public.pantry FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 3. TABELLE RICETTE, PIANI SETTIMANALI E LISTE DELLA SPESA
CREATE TABLE IF NOT EXISTS public.saved_recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  recipe_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their saved recipes" ON public.saved_recipes;
CREATE POLICY "Users can manage their saved recipes"
  ON public.saved_recipes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  slug TEXT UNIQUE,
  recipe_data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public recipes are viewable by everyone" ON public.recipes;
CREATE POLICY "Public recipes are viewable by everyone"
  ON public.recipes FOR SELECT
  USING (is_public = TRUE OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own recipes" ON public.recipes;
CREATE POLICY "Users can insert their own recipes"
  ON public.recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own recipes" ON public.recipes;
CREATE POLICY "Users can delete their own recipes"
  ON public.recipes FOR DELETE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT DEFAULT 'Piano Settimanale',
  plan_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own meal plans" ON public.meal_plans;
CREATE POLICY "Users can manage their own meal plans"
  ON public.meal_plans FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.shopping_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  items JSONB DEFAULT '[]'::jsonb NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id)
);

ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own shopping list" ON public.shopping_lists;
CREATE POLICY "Users can manage their own shopping list"
  ON public.shopping_lists FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 4. CONTATORI QUOTE AI E FUNZIONE ATOMICA (CRITICO 1)
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  ip_hash TEXT,
  action_type TEXT NOT NULL, -- 'recipe', 'vision', 'meal_plan'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_action_date
  ON public.ai_usage_logs (user_id, action_type, created_at);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own AI usage" ON public.ai_usage_logs;
CREATE POLICY "Users can view their own AI usage"
  ON public.ai_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Funzione RPC Atomica per verifica e consumo quota AI
-- Usa pg_advisory_xact_lock per serializzare richieste concorrenti dello stesso utente
CREATE OR REPLACE FUNCTION public.consume_ai_quota(
  p_user_id UUID,
  p_action_type TEXT,
  p_ip_hash TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_is_pro BOOLEAN := FALSE;
  v_period_end TIMESTAMP WITH TIME ZONE;
  v_since TIMESTAMP WITH TIME ZONE;
  v_limit INTEGER;
  v_used INTEGER;
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

  -- Lock transazionale esclusivo su (utente + tipo azione) contro race condition concorrenti
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || ':' || p_action_type));

  SELECT is_pro, subscription_period_end
  INTO v_is_pro, v_period_end
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_is_pro IS TRUE AND v_period_end IS NOT NULL AND v_period_end <= timezone('utc'::text, now()) THEN
    v_is_pro := FALSE;
  END IF;
  v_is_pro := COALESCE(v_is_pro, FALSE);

  -- Configurazione finestra temporale e limite in base al piano
  IF p_action_type = 'recipe' THEN
    v_since := date_trunc('day', timezone('utc'::text, now()));
    v_limit := CASE WHEN v_is_pro THEN 50 ELSE 3 END;
  ELSIF p_action_type = 'vision' THEN
    v_since := date_trunc('month', timezone('utc'::text, now()));
    v_limit := CASE WHEN v_is_pro THEN 50 ELSE 3 END;
  ELSIF p_action_type = 'meal_plan' THEN
    v_since := date_trunc('month', timezone('utc'::text, now()));
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Impedisce la chiamata diretta della funzione da parte di client anonimi/authenticated:
-- solo service_role (il backend Next.js dopo aver validato la richiesta) può invocarla
REVOKE EXECUTE ON FUNCTION public.consume_ai_quota(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;


-- 5. TABELLA IDEMPOTENZA STRIPE WEBHOOKS (CRITICO 2)
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  status TEXT DEFAULT 'processing' NOT NULL, -- 'processing', 'completed'
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'processing' NOT NULL;

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

COMMIT;
