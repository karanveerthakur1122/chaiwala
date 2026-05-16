-- =====================================================
-- Migration: 009_rls_categories
-- Description: RLS policies for categories table
-- Depends on: 007_enable_rls
-- Safe to re-run: YES (DROP IF EXISTS before CREATE)
-- =====================================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can read categories"  ON public.categories;
  DROP POLICY IF EXISTS "Admin can manage categories"  ON public.categories;
END $$;

CREATE POLICY "Anyone can read categories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage categories"
  ON public.categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
