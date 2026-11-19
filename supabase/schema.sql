-- =========================================================================
-- FRIGOCHEF 2.0 — HARDENED PRODUCTION SCHEMA & ROW LEVEL SECURITY (RLS)
-- =========================================================================

-- 1. PROFILES: Dati utente, preferenze alimentari e stato abbonamento
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  referral_code TEXT UNIQUE,
  referred_by TEXT REFERENCES public.profiles(referral_code),
  is_pro BOOLEAN DEFAULT FALSE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'free' NOT NULL, -- 'free', 'trialing', 'active', 'past_due', 'canceled'
  subscription_plan TEXT DEFAULT 'free' NOT NULL,   -- 'free', 'plus_monthly', 'plus_annual'
  subscription_period_end TIMESTAMP WITH TIME ZONE,
  trial_used BOOLEAN DEFAULT FALSE NOT NULL,
  dietary_preferences JSONB DEFAULT '[]'::jsonb NOT NULL,
  allergens JSONB DEFAULT '[]'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

-- REGOLA FONDAMENTALE (Fase 1.2):
-- Impedisce a un utente di diventare Pro o alterare campi di fatturazione dal browser.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'authenticated' THEN
    IF NEW.is_pro IS DISTINCT FROM OLD.is_pro
       OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
       OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
       OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
       OR NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
       OR NEW.subscription_period_end IS DISTINCT FROM OLD.subscription_period_end
       OR NEW.trial_used IS DISTINCT FROM OLD.trial_used
       OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
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


-- 2. PANTRY: Dispensa, Frigorifero e Congelatore dell'utente
CREATE TABLE IF NOT EXISTS public.pantry (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  ingredients JSONB DEFAULT '[]'::jsonb NOT NULL,
  items_detail JSONB DEFAULT '[]'::jsonb NOT NULL, -- [{name, quantity, location, purchaseDate, expiryDate}]
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id)
);

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


-- 3. SAVED RECIPES: Ricettario privato dell'utente
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


-- 4. PUBLIC RECIPES: Ricette condivisibili tramite link pubblico
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


-- 5. MEAL PLANS: Piani settimanali salvati dall'utente
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


-- 6. SHOPPING LISTS: Liste della spesa sincronizzate
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


-- 7. AI USAGE LOGS: Contatori di utilizzo AI (IMMUTABILI dagli utenti per evitare reset limiti Free)
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  ip_hash TEXT,
  action_type TEXT NOT NULL, -- 'recipe', 'vision', 'meal_plan'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Gli utenti possono solo leggere i propri contatori, MAI modificarli o cancellarli
DROP POLICY IF EXISTS "Users can view their own AI usage" ON public.ai_usage_logs;
CREATE POLICY "Users can view their own AI usage"
  ON public.ai_usage_logs FOR SELECT
  USING (auth.uid() = user_id);


-- 8. STRIPE WEBHOOK EVENTS: Tabella di idempotenza (accessibile solo da service_role)
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
-- Nessuna policy client: solo service_role può leggere/scrivere gli eventi Stripe


-- 9. CREAZIONE AUTOMATICA PROFILO ALLA REGISTRAZIONE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, referred_by, referral_code)
  VALUES (
    new.id,
    new.email,
    (new.raw_user_meta_data->>'referred_by'),
    UPPER(SUBSTRING(MD5(new.id::text || now()::text) FROM 1 FOR 8))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
