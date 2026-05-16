-- =====================================================
-- Migration: 025_admin_delete_profiles
-- Description: Allow admin to delete any profile (user management)
-- Depends on: 008_rls_profiles
-- Safe to re-run: YES (DROP IF EXISTS before CREATE)
-- =====================================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin can delete any profile" ON public.profiles;
END $$;

CREATE POLICY "Admin can delete any profile"
  ON public.profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );
