-- =====================================================
-- Migration: 017_rls_admin_update_profiles
-- Description: Allow admin to update any profile (needed for role assignment)
-- Depends on: 008_rls_profiles
-- Safe to re-run: YES (DROP IF EXISTS before CREATE)
-- =====================================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin can update any profile" ON public.profiles;
END $$;

CREATE POLICY "Admin can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );
