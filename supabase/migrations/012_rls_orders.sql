-- =====================================================
-- Migration: 012_rls_orders
-- Description: RLS policies for orders table
-- Depends on: 007_enable_rls
-- Safe to re-run: YES (DROP IF EXISTS before CREATE)
-- =====================================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read relevant orders"  ON public.orders;
  DROP POLICY IF EXISTS "Users can create orders"          ON public.orders;
  DROP POLICY IF EXISTS "Staff can update orders"          ON public.orders;
END $$;

CREATE POLICY "Users can read relevant orders"
  ON public.orders FOR SELECT
  USING (
    auth.uid() = customer_id
    OR auth.uid() = waiter_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager', 'reception', 'cook')
    )
  );

CREATE POLICY "Users can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can update orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() IS NOT NULL);
