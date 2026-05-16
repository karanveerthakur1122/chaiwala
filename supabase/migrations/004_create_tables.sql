-- =====================================================
-- Migration: 004_create_tables
-- Description: Create tables table for seating management
-- Safe to re-run: YES (IF NOT EXISTS)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  capacity int DEFAULT 4,
  status text DEFAULT 'free'
    CHECK (status IN ('free', 'occupied', 'reserved')),
  created_at timestamptz DEFAULT now()
);
