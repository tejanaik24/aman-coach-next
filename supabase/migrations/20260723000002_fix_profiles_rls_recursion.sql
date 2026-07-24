-- Fixes: {"code":"42P17","message":"infinite recursion detected in policy for relation \"profiles\""}
--
-- Root cause: the "Coach can view all client profiles" policy on `profiles`
-- runs `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')`
-- inside its own USING clause. Postgres re-evaluates RLS on that inner SELECT
-- against `profiles` too, which re-triggers the same policy, forever.
--
-- Fix: move the role lookup into a SECURITY DEFINER function. Such a function
-- runs with the privileges of its owner, so its internal query bypasses RLS
-- entirely instead of re-entering the policy that calls it.

CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_coach() TO authenticated;

DROP POLICY IF EXISTS "Coach can view all client profiles" ON profiles;
CREATE POLICY "Coach can view all client profiles" ON profiles FOR SELECT TO authenticated USING (
  role = 'client' AND public.is_coach()
);
