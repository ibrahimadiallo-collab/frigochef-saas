-- =====================================================================
-- FRIGOCHEF — SCHEMA COMPLETO (idempotente)
-- Eseguire nel Supabase SQL Editor. Può essere rieseguito senza errori.
-- Compatibile con lo schema precedente (supabase/schema.sql in root):
--   * `profiles` invariata
--   * `recipes` esistente viene ESTESA (ALTER ... ADD COLUMN IF NOT EXISTS)
--   * `pantry` (JSONB legacy) viene migrata opzionalmente in `pantry_items`
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. PROFILES (SaaS status, referral)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  is_pro BOOLEAN DEFAULT FALSE,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
-- Pro temporaneo sbloccato dai referral + data in cui l'utente ha riscattato un codice.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_claimed_at TIMESTAMPTZ;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Impedisce all'utente di auto-promuoversi a Pro aggiornando il proprio profilo:
-- is_pro / stripe_customer_id si modificano solo con service role (webhook Stripe).
CREATE OR REPLACE FUNCTION public.protect_profile_billing()
RETURNS TRIGGER AS $$
BEGIN
  -- current_user = 'authenticated' solo per richieste dirette del client:
  -- le funzioni SECURITY DEFINER (es. claim_referral) possono aggiornare i campi protetti.
  IF COALESCE(auth.jwt()->>'role', '') = 'authenticated' AND current_user = 'authenticated' THEN
    NEW.is_pro := OLD.is_pro;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.pro_expires_at := OLD.pro_expires_at;
    NEW.referral_claimed_at := OLD.referral_claimed_at;
    NEW.referred_by := OLD.referred_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_profile_billing ON public.profiles;
CREATE TRIGGER protect_profile_billing
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_billing();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, referred_by)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'referred_by'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------
-- 1. PANTRY ITEMS (un record per ingrediente)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pantry_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  quantity DECIMAL,
  unit TEXT DEFAULT 'pcs',
  category TEXT DEFAULT 'other',
  added_at TIMESTAMPTZ DEFAULT NOW(),
  estimated_expiration TIMESTAMPTZ,
  freshness_status TEXT CHECK (freshness_status IN ('fresh', 'soon', 'critical')) DEFAULT 'fresh',
  source TEXT CHECK (source IN ('scan', 'manual', 'import')) DEFAULT 'manual',
  confidence DECIMAL DEFAULT 1.0,
  image_url TEXT,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS pantry_items_user_idx ON public.pantry_items (user_id);
CREATE INDEX IF NOT EXISTS pantry_items_user_name_idx ON public.pantry_items (user_id, lower(name));
CREATE INDEX IF NOT EXISTS pantry_items_expiration_idx ON public.pantry_items (user_id, estimated_expiration);

-- ---------------------------------------------------------------------
-- 2. RECIPES (salvate dall'utente + condivisione pubblica)
--    La tabella esisteva già (id, user_id, slug, recipe_data, is_public, created_at):
--    la creiamo se manca e aggiungiamo le colonne strutturate.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled recipe',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS prep_time INTEGER;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS cook_time INTEGER;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'easy';
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS servings INTEGER DEFAULT 2;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS ingredients JSONB DEFAULT '[]';
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS steps JSONB DEFAULT '[]';
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS nutrition JSONB DEFAULT '{}';
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS used_pantry_ingredients TEXT[] DEFAULT '{}';
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS missing_ingredients TEXT[] DEFAULT '{}';
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS meal_type TEXT;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;
-- Colonne legacy (condivisione/SEO)
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS recipe_data JSONB;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE public.recipes ALTER COLUMN recipe_data DROP NOT NULL;
-- Le nuove ricette sono private di default (prima erano tutte pubbliche).
ALTER TABLE public.recipes ALTER COLUMN is_public SET DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recipes_difficulty_check') THEN
    ALTER TABLE public.recipes
      ADD CONSTRAINT recipes_difficulty_check CHECK (difficulty IN ('easy', 'medium', 'hard')) NOT VALID;
  END IF;
END $$;

-- Backfill del titolo per le ricette legacy
UPDATE public.recipes SET title = COALESCE(recipe_data->>'nome', 'Untitled recipe') WHERE title IS NULL;

CREATE INDEX IF NOT EXISTS recipes_user_idx ON public.recipes (user_id, created_at DESC);

-- ---------------------------------------------------------------------
-- 3. SCAN SESSIONS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scan_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT,
  raw_result JSONB,
  confirmed_ingredients JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  provider TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.scan_sessions ADD COLUMN IF NOT EXISTS provider TEXT;
CREATE INDEX IF NOT EXISTS scan_sessions_user_idx ON public.scan_sessions (user_id, created_at DESC);

-- ---------------------------------------------------------------------
-- 4. MEAL PLANS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  plan JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS meal_plans_user_idx ON public.meal_plans (user_id, week_start DESC);
-- Un solo piano per settimana (necessario per l'upsert): rimuove eventuali duplicati legacy.
DELETE FROM public.meal_plans a USING public.meal_plans b
  WHERE a.user_id = b.user_id AND a.week_start = b.week_start AND a.created_at < b.created_at;
CREATE UNIQUE INDEX IF NOT EXISTS meal_plans_user_week_uidx ON public.meal_plans (user_id, week_start);

-- ---------------------------------------------------------------------
-- 5. SHOPPING LIST ITEMS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shopping_list_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  quantity DECIMAL,
  unit TEXT,
  category TEXT DEFAULT 'other',
  checked BOOLEAN DEFAULT FALSE,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS shopping_list_items_user_idx ON public.shopping_list_items (user_id);

-- ---------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access their own pantry" ON public.pantry_items;
CREATE POLICY "Users can only access their own pantry" ON public.pantry_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access their own recipes" ON public.recipes;
CREATE POLICY "Users can only access their own recipes" ON public.recipes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Le ricette condivise esplicitamente restano leggibili da tutti (pagina /recipe/[id]).
DROP POLICY IF EXISTS "Public recipes are viewable by everyone" ON public.recipes;
CREATE POLICY "Public recipes are viewable by everyone" ON public.recipes
  FOR SELECT USING (is_public = TRUE);

-- Policy legacy che permetteva insert anonimi con user_id NULL: rimossa.
DROP POLICY IF EXISTS "Users can insert their own recipes" ON public.recipes;

DROP POLICY IF EXISTS "Users can only access their own scans" ON public.scan_sessions;
CREATE POLICY "Users can only access their own scans" ON public.scan_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access their own meal plans" ON public.meal_plans;
CREATE POLICY "Users can only access their own meal plans" ON public.meal_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access their own shopping list" ON public.shopping_list_items;
CREATE POLICY "Users can only access their own shopping list" ON public.shopping_list_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 7. MIGRAZIONE OPZIONALE: pantry (JSONB legacy) -> pantry_items
--    Gestisce sia array di stringhe sia array di oggetti {name}.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pantry') THEN
    INSERT INTO public.pantry_items (user_id, name, source)
    SELECT p.user_id,
           lower(trim(CASE WHEN jsonb_typeof(elem) = 'string' THEN elem #>> '{}' ELSE elem->>'name' END)),
           'import'
    FROM public.pantry p
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.ingredients, '[]'::jsonb)) AS elem
    WHERE NOT EXISTS (SELECT 1 FROM public.pantry_items pi WHERE pi.user_id = p.user_id)
      AND COALESCE(CASE WHEN jsonb_typeof(elem) = 'string' THEN elem #>> '{}' ELSE elem->>'name' END, '') <> '';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 8. REFERRAL: conteggio aggregato (la RLS impedisce di leggere i profili altrui)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.referral_count(code TEXT)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM public.profiles
  WHERE referred_by = code
    AND code = (SELECT referral_code FROM public.profiles WHERE id = auth.uid());
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.referral_count(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.referral_count(TEXT) TO authenticated;

-- ---------------------------------------------------------------------
-- 9. REFERRAL CLAIM: l'utente riscatta un codice, il proprietario riceve 7 giorni di Pro
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_referral(code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me public.profiles%ROWTYPE;
  owner_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  SELECT * INTO me FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_profile');
  END IF;
  IF me.referral_claimed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
  END IF;
  SELECT id INTO owner_id FROM public.profiles WHERE upper(referral_code) = upper(trim(code));
  IF owner_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;
  IF owner_id = me.id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'own_code');
  END IF;

  UPDATE public.profiles
     SET referred_by = (SELECT referral_code FROM public.profiles WHERE id = owner_id),
         referral_claimed_at = NOW()
   WHERE id = me.id;
  UPDATE public.profiles
     SET pro_expires_at = GREATEST(COALESCE(pro_expires_at, NOW()), NOW()) + INTERVAL '7 days'
   WHERE id = owner_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.claim_referral(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_referral(TEXT) TO authenticated;

-- Il conteggio considera solo i referral effettivamente riscattati.
CREATE OR REPLACE FUNCTION public.referral_count(code TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.profiles
  WHERE referred_by = code
    AND referral_claimed_at IS NOT NULL
    AND code = (SELECT referral_code FROM public.profiles WHERE id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- 10. ANALYTICS EVENTS (solo insert dal client; lettura via service role)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS analytics_events_event_idx ON public.analytics_events (event, created_at DESC);
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert their own events" ON public.analytics_events;
CREATE POLICY "Users can insert their own events" ON public.analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Eventi anonimi (es. landing_view) senza user_id.
DROP POLICY IF EXISTS "Anyone can insert anonymous events" ON public.analytics_events;
CREATE POLICY "Anyone can insert anonymous events" ON public.analytics_events
  FOR INSERT WITH CHECK (user_id IS NULL);
