-- =====================================================
-- Migration: 023_fix_rls_security
-- Description: Tighten RLS policies:
--   1. orders UPDATE: only staff (admin/receptionist) can update
--   2. order_items UPDATE: only staff can update
--   3. profiles SELECT: authenticated users only (not public)
--   4. orders DELETE: allow owner to delete own order (for failed-insert cleanup)
-- Depends on: 012, 013, 008, 020
-- Safe to re-run: YES (DROP IF EXISTS before CREATE)
-- =====================================================

-- ========== FIX 1: orders UPDATE — restrict to staff only ==========

DO $$ BEGIN
  DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
END $$;

CREATE POLICY "Staff can update orders"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'receptionist')
    )
  );

-- ========== FIX 2: order_items UPDATE — restrict to staff only ==========

DO $$ BEGIN
  DROP POLICY IF EXISTS "Staff can update order items" ON public.order_items;
END $$;

CREATE POLICY "Staff can update order items"
  ON public.order_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'receptionist')
    )
  );

-- ========== FIX 3: profiles SELECT — authenticated users only ==========

DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
END $$;

CREATE POLICY "Authenticated users can read profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ========== FIX 4: orders DELETE — owner can delete own order ==========

DO $$ BEGIN
  DROP POLICY IF EXISTS "Owner can delete own order" ON public.orders;
END $$;

CREATE POLICY "Owner can delete own order"
  ON public.orders FOR DELETE
  USING (auth.uid() = customer_id);
