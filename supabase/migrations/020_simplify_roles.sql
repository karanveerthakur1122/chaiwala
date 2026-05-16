-- =====================================================
-- Migration: 020_simplify_roles
-- Description: Simplify from 6 roles to 3 roles:
--              customer, receptionist, admin
--              Maps: waiter/cook/reception -> receptionist
--                    manager -> admin
-- Depends on: 001, 011, 012, 013, 018
-- Safe to re-run: YES (idempotent with IF EXISTS guards)
-- =====================================================

DO $$
DECLARE
  _tbl_exists BOOLEAN;
  _updated_count INTEGER;
BEGIN

  RAISE NOTICE '[020] Starting role simplification migration...';

  -- ========== CHECKPOINT: Verify profiles table exists ==========

  SELECT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles'
  ) INTO _tbl_exists;

  IF NOT _tbl_exists THEN
    RAISE NOTICE '[020] Skipping: public.profiles does not exist yet';
    RETURN;
  END IF;

  -- ========== STEP 1: Drop old CHECK constraint FIRST ==========
  -- Must happen before data migration so 'receptionist' is allowed

  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

  RAISE NOTICE '[020] Old CHECK constraint dropped';

  -- ========== STEP 2: Migrate existing role data ==========

  UPDATE public.profiles SET role = 'receptionist'
  WHERE role IN ('waiter', 'cook', 'reception');
  GET DIAGNOSTICS _updated_count = ROW_COUNT;
  RAISE NOTICE '[020] Migrated % row(s) to receptionist', _updated_count;

  UPDATE public.profiles SET role = 'admin'
  WHERE role = 'manager';
  GET DIAGNOSTICS _updated_count = ROW_COUNT;
  RAISE NOTICE '[020] Migrated % row(s) to admin', _updated_count;

  -- ========== STEP 3: Add new CHECK constraint ==========

  ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('customer', 'receptionist', 'admin'));

  RAISE NOTICE '[020] New CHECK constraint applied (customer, receptionist, admin)';

  -- ========== STEP 4: Verify no orphaned roles remain ==========

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE role NOT IN ('customer', 'receptionist', 'admin')
  ) THEN
    RAISE EXCEPTION '[020] FATAL: Found profiles with roles outside (customer, receptionist, admin). Aborting.';
  END IF;

  RAISE NOTICE '[020] Verification passed — all profiles have valid roles';

  -- ========== STEP 5: Update RLS — tables (011 + 018) ==========

  SELECT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tables'
  ) INTO _tbl_exists;

  IF _tbl_exists THEN
    DROP POLICY IF EXISTS "Staff can manage tables"  ON public.tables;
    DROP POLICY IF EXISTS "Staff can insert tables"  ON public.tables;
    DROP POLICY IF EXISTS "Staff can update tables"  ON public.tables;
    DROP POLICY IF EXISTS "Staff can delete tables"  ON public.tables;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'tables' AND policyname = 'Staff can insert tables'
    ) THEN
      CREATE POLICY "Staff can insert tables"
        ON public.tables FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid() AND role IN ('admin', 'receptionist')
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
            WHERE user_id = auth.uid() AND role IN ('admin', 'receptionist')
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
            WHERE user_id = auth.uid() AND role IN ('admin', 'receptionist')
          )
        );
    END IF;

    RAISE NOTICE '[020] Tables RLS policies updated';
  ELSE
    RAISE NOTICE '[020] Skipping tables RLS — table does not exist';
  END IF;

  -- ========== STEP 6: Update RLS — orders (012) ==========

  SELECT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders'
  ) INTO _tbl_exists;

  IF _tbl_exists THEN
    DROP POLICY IF EXISTS "Users can read relevant orders" ON public.orders;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Users can read relevant orders'
    ) THEN
      CREATE POLICY "Users can read relevant orders"
        ON public.orders FOR SELECT
        USING (
          auth.uid() = customer_id
          OR auth.uid() = waiter_id
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid()
              AND role IN ('admin', 'receptionist')
          )
        );
    END IF;

    RAISE NOTICE '[020] Orders RLS policies updated';
  ELSE
    RAISE NOTICE '[020] Skipping orders RLS — table does not exist';
  END IF;

  -- ========== STEP 7: Update RLS — order_items (013) ==========

  SELECT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_items'
  ) INTO _tbl_exists;

  IF _tbl_exists THEN
    DROP POLICY IF EXISTS "Users can read order items" ON public.order_items;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'Users can read order items'
    ) THEN
      CREATE POLICY "Users can read order items"
        ON public.order_items FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
              AND (
                orders.customer_id = auth.uid()
                OR orders.waiter_id = auth.uid()
                OR EXISTS (
                  SELECT 1 FROM public.profiles
                  WHERE user_id = auth.uid()
                    AND role IN ('admin', 'receptionist')
                )
              )
          )
        );
    END IF;

    RAISE NOTICE '[020] Order items RLS policies updated';
  ELSE
    RAISE NOTICE '[020] Skipping order_items RLS — table does not exist';
  END IF;

  RAISE NOTICE '[020] Migration complete. Roles simplified to: customer, receptionist, admin';

END $$;
