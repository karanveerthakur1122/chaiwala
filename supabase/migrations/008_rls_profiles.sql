-- =====================================================
-- Migration: 008_rls_profiles
-- Description: RLS policies for profiles table
-- Depends on: 007_enable_rls
-- Safe to re-run: YES (DROP IF EXISTS before CREATE)
-- =====================================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can read profiles"      ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile"   ON public.profiles;
  DROP POLICY IF EXISTS "Users can insert own profile"   ON public.profiles;
END $$;

CREATE POLICY "Anyone can read profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
