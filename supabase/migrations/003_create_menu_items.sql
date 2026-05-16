-- =====================================================
-- Migration: 003_create_menu_items
-- Description: Create menu_items table for food/drink items
-- Depends on: 002_create_categories
-- Safe to re-run: YES (IF NOT EXISTS)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  image_url text,
  is_available boolean DEFAULT true,
  is_veg boolean DEFAULT true,
  prep_time_mins int DEFAULT 5,
  created_at timestamptz DEFAULT now()
);
