-- =====================================================
-- Migration: 013_rls_order_items
-- Description: RLS policies for order_items table
-- Depends on: 007_enable_rls
-- Safe to re-run: YES (DROP IF EXISTS before CREATE)
-- =====================================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read order items"   ON public.order_items;
  DROP POLICY IF EXISTS "Users can create order items"  ON public.order_items;
  DROP POLICY IF EXISTS "Staff can update order items"  ON public.order_items;
END $$;

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
              AND role IN ('admin', 'manager', 'reception', 'cook')
          )
        )
    )
  );

CREATE POLICY "Users can create order items"
  ON public.order_items FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can update order items"
  ON public.order_items FOR UPDATE
  USING (auth.uid() IS NOT NULL);
