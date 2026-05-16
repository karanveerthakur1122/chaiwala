-- =====================================================
-- Migration: 001_create_profiles
-- Description: Create profiles table extending auth.users
-- Safe to re-run: YES (IF NOT EXISTS)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  phone text,
  role text NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer', 'waiter', 'cook', 'reception', 'manager', 'admin')),
  avatar_url text,
  created_at timestamptz DEFAULT now()
);
