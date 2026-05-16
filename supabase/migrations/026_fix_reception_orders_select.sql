-- =====================================================
-- Migration: 026_fix_reception_orders_select
-- Description: Align orders and order_items SELECT RLS with simplified roles.
--              Profiles use 'receptionist' (migration 020), but SELECT policies
--              could still require 'reception', so staff could not read customer orders.
-- Depends on: 012, 013, 020
-- Safe to re-run: YES (DROP IF EXISTS before CREATE)
-- =====================================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read relevant orders" ON public.orders;
END $$;

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

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read order items" ON public.order_items;
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
              AND role IN ('admin', 'receptionist')
          )
        )
    )
  );
