-- =====================================================
-- Migration: 024_fix_insert_rls
-- Description: Tighten INSERT policies on orders and order_items:
--   1. orders INSERT: owner must match auth.uid() OR staff
--   2. order_items INSERT: must own the parent order OR be staff
--   3. order_items DELETE: staff only
--   4. orders DELETE: staff can delete walk-in (customer_id IS NULL)
-- Depends on: 012, 013, 023
-- Safe to re-run: YES (DROP IF EXISTS before CREATE)
-- =====================================================

-- ========== FIX 1: orders INSERT — enforce ownership or staff ==========

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
END $$;

CREATE POLICY "Users can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      customer_id = auth.uid()
      OR customer_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'receptionist')
      )
    )
  );

-- ========== FIX 2: order_items INSERT — must own parent order or be staff ==========

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
END $$;

CREATE POLICY "Users can create order items"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND (
          orders.customer_id = auth.uid()
          OR orders.customer_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid()
              AND role IN ('admin', 'receptionist')
          )
        )
    )
  );

-- ========== FIX 3: order_items DELETE — staff only ==========

DO $$ BEGIN
  DROP POLICY IF EXISTS "Staff can delete order items" ON public.order_items;
END $$;

CREATE POLICY "Staff can delete order items"
  ON public.order_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'receptionist')
    )
  );

-- ========== FIX 4: orders DELETE — staff can delete walk-in orders ==========

DO $$ BEGIN
  DROP POLICY IF EXISTS "Owner can delete own order" ON public.orders;
  DROP POLICY IF EXISTS "Owner or staff can delete order" ON public.orders;
END $$;

CREATE POLICY "Owner or staff can delete order"
  ON public.orders FOR DELETE
  USING (
    auth.uid() = customer_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'receptionist')
    )
  );
