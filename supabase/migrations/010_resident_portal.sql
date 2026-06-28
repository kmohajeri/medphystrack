-- ============================================================
-- Migration 010: Resident Portal
--
-- 1. Update handle_new_user() trigger to auto-link residents.user_id
--    by email AND pre-fill the profile with role/org/name so a
--    resident can log in immediately after accepting the invite.
-- 2. Add UPDATE RLS policy on resident_modules so residents can
--    update their own module status / started_at / completed_at.
-- ============================================================

-- Replace handle_new_user() with the smarter version
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_resident public.residents%ROWTYPE;
BEGIN
  -- Look for an unlinked resident record with matching email
  SELECT * INTO v_resident
  FROM public.residents
  WHERE email = new.email
    AND user_id IS NULL
  LIMIT 1;

  IF v_resident.id IS NOT NULL THEN
    -- This is a resident accepting an invite:
    -- create profile pre-filled with role + org + name
    INSERT INTO public.profiles (id, email, role, org_id, first_name, last_name)
    VALUES (new.id, new.email, 'resident', v_resident.org_id,
            v_resident.first_name, v_resident.last_name);

    -- Link the resident record to the new auth user
    UPDATE public.residents
    SET user_id = new.id
    WHERE id = v_resident.id;
  ELSE
    -- Normal signup (super_admin / program_admin / etc.)
    -- role assigned by a super_admin afterward
    INSERT INTO public.profiles (id, email)
    VALUES (new.id, new.email);
  END IF;

  RETURN new;
END;
$$;

-- Allow residents to update their own resident_modules rows
-- (status, started_at, completed_at updated as they progress)
CREATE POLICY "resident: update own resident_modules"
  ON public.resident_modules
  FOR UPDATE
  USING (
    resident_id IN (
      SELECT id FROM public.residents WHERE user_id = auth.uid()
    )
  );
