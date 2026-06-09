-- FRIGOCHEF CORE SCHEMA
-- Run this in your Supabase SQL Editor

-- 1. PROFILES: User data and SaaS status
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  referral_code TEXT UNIQUE,
  referred_by TEXT REFERENCES public.profiles(referral_code),
  is_pro BOOLEAN DEFAULT FALSE,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- 2. PANTRY: Ingredients list per user
CREATE TABLE IF NOT EXISTS public.pantry (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  ingredients JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id)
);

-- Enable RLS for Pantry
ALTER TABLE public.pantry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pantry" 
  ON public.pantry FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own pantry" 
  ON public.pantry FOR ALL 
  USING (auth.uid() = user_id);

-- 3. SAVED RECIPES (Private favorites)
CREATE TABLE IF NOT EXISTS public.saved_recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  recipe_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their saved recipes" 
  ON public.saved_recipes FOR ALL 
  USING (auth.uid() = user_id);

-- 5. PUBLIC RECIPES (For sharing and SEO)
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  slug TEXT UNIQUE,
  recipe_data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public recipes are viewable by everyone" 
  ON public.recipes FOR SELECT 
  USING (is_public = TRUE);

CREATE POLICY "Users can insert their own recipes" 
  ON public.recipes FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 4. AUTOMATIC PROFILE CREATION ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, referred_by)
  VALUES (new.id, new.email, (new.raw_user_meta_data->>'referred_by'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
