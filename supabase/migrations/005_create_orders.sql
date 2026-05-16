-- =====================================================
-- Migration: 005_create_orders
-- Description: Create orders table for customer/waiter orders
-- Depends on: 004_create_tables
-- Safe to re-run: YES (IF NOT EXISTS)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  table_id uuid REFERENCES public.tables(id) ON DELETE SET NULL,
  waiter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'placed'
    CHECK (status IN ('placed', 'accepted', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
  total numeric(10,2) DEFAULT 0,
  order_type text DEFAULT 'dine_in'
    CHECK (order_type IN ('dine_in', 'takeaway')),
  notes text,
  created_at timestamptz DEFAULT now()
);
