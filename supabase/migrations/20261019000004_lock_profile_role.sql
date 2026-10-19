-- Security: nobody can make themselves a coach.
-- 1) A logged-in user (or anon) cannot change profiles.role, or insert a profile with a role other than 'client'.
--    Server code (service_role) and the database owner are unaffected.
-- 2) New auth users always get role 'client' from the signup trigger. Before this, the role came from
--    user-supplied raw_user_meta_data, so a public sign-up could claim role 'coach'.
--    The coach account is set by the server (api/admin/setup-coach upserts role 'coach' with service_role).

CREATE OR REPLACE FUNCTION public.lock_profile_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' AND NEW.role IS DISTINCT FROM 'client' THEN
      RAISE EXCEPTION 'role not allowed';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'role cannot be changed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_profile_role ON public.profiles;
CREATE TRIGGER lock_profile_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.lock_profile_role();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, role, must_reset_password)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    'client',
    true
  );
  RETURN NEW;
END;
$$;
