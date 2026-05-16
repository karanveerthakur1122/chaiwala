-- =====================================================
-- Migration: 007_enable_rls
-- Description: Enable Row Level Security on all tables
-- Depends on: 001-006
-- Safe to re-run: YES (ENABLE is idempotent)
-- =====================================================

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
