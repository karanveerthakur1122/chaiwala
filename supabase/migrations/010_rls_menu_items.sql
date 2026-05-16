-- =====================================================
-- Migration: 010_rls_menu_items
-- Description: RLS policies for menu_items table
-- Depends on: 007_enable_rls
-- Safe to re-run: YES (DROP IF EXISTS before CREATE)
-- =====================================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can read menu items"  ON public.menu_items;
  DROP POLICY IF EXISTS "Admin can manage menu items"  ON public.menu_items;
END $$;

CREATE POLICY "Anyone can read menu items"
  ON public.menu_items FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage menu items"
  ON public.menu_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
