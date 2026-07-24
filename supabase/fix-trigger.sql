-- FIX: Recreate handle_new_user trigger with public.profiles schema prefix
-- and must_reset_password=true for new clients
-- Applied: 2026-07-24

-- 1. Add email column to clients table if missing
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Drop old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- 3. Create updated function with must_reset_password
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, role, must_reset_password)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'client') = 'client' THEN true ELSE false END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 5. Verify: SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';
-- Expected: tgenabled = 1
