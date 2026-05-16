-- =====================================================
-- Migration: 018_fix_admin_crud_policies
-- Description: Replace FOR ALL policies with explicit per-operation
--              policies for categories, menu_items, and tables.
--              FOR ALL + separate FOR SELECT causes INSERT to fail
--              in Supabase due to policy resolution ambiguity.
-- Depends on: 009, 010, 011
-- Safe to re-run: YES
-- Safety: All operations wrapped in a single DO block with
--         IF EXISTS / IF NOT EXISTS guards on every statement.
--         Tables verified before touching policies.
--         Full rollback on any failure (transactional).
-- =====================================================

DO $$
BEGIN

  -- ========== CHECKPOINT: Verify tables exist ==========

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'categories') THEN
    RAISE NOTICE '[018] Skipping: public.categories does not exist yet';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'menu_items') THEN
    RAISE NOTICE '[018] Skipping: public.menu_items does not exist yet';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tables') THEN
    RAISE NOTICE '[018] Skipping: public.tables does not exist yet';
    RETURN;
  END IF;

  RAISE NOTICE '[018] All target tables verified. Proceeding...';


  -- ========== CATEGORIES: Drop old policies ==========

  DROP POLICY IF EXISTS "Anyone can read categories"    ON public.categories;
  DROP POLICY IF EXISTS "Admin can manage categories"   ON public.categories;
  DROP POLICY IF EXISTS "Admin can insert categories"   ON public.categories;
  DROP POLICY IF EXISTS "Admin can update categories"   ON public.categories;
  DROP POLICY IF EXISTS "Admin can delete categories"   ON public.categories;

  RAISE NOTICE '[018] Categories: old policies dropped';


  -- ========== CATEGORIES: Create new policies ==========

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'categories' AND policyname = 'Anyone can read categories'
  ) THEN
    CREATE POLICY "Anyone can read categories"
      ON public.categories FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'categories' AND policyname = 'Admin can insert categories'
  ) THEN
    CREATE POLICY "Admin can insert categories"
      ON public.categories FOR INSERT
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'categories' AND policyname = 'Admin can update categories'
  ) THEN
    CREATE POLICY "Admin can update categories"
      ON public.categories FOR UPDATE
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'categories' AND policyname = 'Admin can delete categories'
  ) THEN
    CREATE POLICY "Admin can delete categories"
      ON public.categories FOR DELETE
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
      );
  END IF;

  RAISE NOTICE '[018] Categories: 4 policies created';


  -- ========== MENU ITEMS: Drop old policies ==========

  DROP POLICY IF EXISTS "Anyone can read menu items"    ON public.menu_items;
  DROP POLICY IF EXISTS "Admin can manage menu items"   ON public.menu_items;
  DROP POLICY IF EXISTS "Admin can insert menu items"   ON public.menu_items;
  DROP POLICY IF EXISTS "Admin can update menu items"   ON public.menu_items;
  DROP POLICY IF EXISTS "Admin can delete menu items"   ON public.menu_items;

  RAISE NOTICE '[018] Menu items: old policies dropped';


  -- ========== MENU ITEMS: Create new policies ==========

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'menu_items' AND policyname = 'Anyone can read menu items'
  ) THEN
    CREATE POLICY "Anyone can read menu items"
      ON public.menu_items FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'menu_items' AND policyname = 'Admin can insert menu items'
  ) THEN
    CREATE POLICY "Admin can insert menu items"
      ON public.menu_items FOR INSERT
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'menu_items' AND policyname = 'Admin can update menu items'
  ) THEN
    CREATE POLICY "Admin can update menu items"
      ON public.menu_items FOR UPDATE
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'menu_items' AND policyname = 'Admin can delete menu items'
  ) THEN
    CREATE POLICY "Admin can delete menu items"
      ON public.menu_items FOR DELETE
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
      );
  END IF;

  RAISE NOTICE '[018] Menu items: 4 policies created';


  -- ========== TABLES: Drop old policies ==========

  DROP POLICY IF EXISTS "Anyone can read tables"      ON public.tables;
  DROP POLICY IF EXISTS "Staff can manage tables"     ON public.tables;
  DROP POLICY IF EXISTS "Staff can insert tables"     ON public.tables;
  DROP POLICY IF EXISTS "Staff can update tables"     ON public.tables;
  DROP POLICY IF EXISTS "Staff can delete tables"     ON public.tables;

  RAISE NOTICE '[018] Tables: old policies dropped';


  -- ========== TABLES: Create new policies ==========

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tables' AND policyname = 'Anyone can read tables'
  ) THEN
    CREATE POLICY "Anyone can read tables"
      ON public.tables FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tables' AND policyname = 'Staff can insert tables'
  ) THEN
    CREATE POLICY "Staff can insert tables"
      ON public.tables FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE user_id = auth.uid() AND role IN ('admin', 'reception', 'waiter')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tables' AND policyname = 'Staff can update tables'
  ) THEN
    CREATE POLICY "Staff can update tables"
      ON public.tables FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE user_id = auth.uid() AND role IN ('admin', 'reception', 'waiter')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tables' AND policyname = 'Staff can delete tables'
  ) THEN
    CREATE POLICY "Staff can delete tables"
      ON public.tables FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE user_id = auth.uid() AND role IN ('admin', 'reception', 'waiter')
        )
      );
  END IF;

  RAISE NOTICE '[018] Tables: 4 policies created';
  RAISE NOTICE '[018] Migration complete. All 12 policies applied.';

END $$;
