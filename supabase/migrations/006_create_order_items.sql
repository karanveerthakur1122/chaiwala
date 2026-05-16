-- =====================================================
-- Migration: 006_create_order_items
-- Description: Create order_items table for line items in an order
-- Depends on: 005_create_orders, 003_create_menu_items
-- Safe to re-run: YES (IF NOT EXISTS)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  quantity int NOT NULL DEFAULT 1,
  price numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'preparing', 'ready')),
  created_at timestamptz DEFAULT now()
);
