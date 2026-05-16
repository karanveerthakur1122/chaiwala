-- =====================================================
-- Migration: 016_set_admin_user
-- Description: Promote karanvthakur1122@gmail.com to admin role
-- Depends on: 001_create_profiles, 014_trigger_auto_profile
-- Safe to re-run: YES (UPDATE is idempotent)
-- Pre-requisite: User must have signed up first
-- =====================================================

UPDATE public.profiles
SET role = 'admin'
WHERE user_id = (
  SELECT id FROM auth.users
  WHERE email = 'karanvthakur1122@gmail.com'
  LIMIT 1
);
