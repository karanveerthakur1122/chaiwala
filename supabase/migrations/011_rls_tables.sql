-- =====================================================
-- Migration: 011_rls_tables
-- Description: RLS policies for tables table
-- Depends on: 007_enable_rls
-- Safe to re-run: YES (DROP IF EXISTS before CREATE)
-- =====================================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can read tables"  ON public.tables;
  DROP POLICY IF EXISTS "Staff can manage tables"  ON public.tables;
END $$;

CREATE POLICY "Anyone can read tables"
  ON public.tables FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage tables"
  ON public.tables FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'reception', 'waiter')
    )
  );
