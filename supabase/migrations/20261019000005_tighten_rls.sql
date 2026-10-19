-- Security sweep 2026-10-19: close every write/read the public anon key or a logged-in client should not have.
-- All server routes use the service role and are unaffected. Browser writes kept working are noted per block.

-- 1) Legacy tables from old loose SQL files: lock if they exist (no browser code uses them; service role only).
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.onboarding_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wearable_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.food_database ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.coach_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointments ENABLE ROW LEVEL SECURITY;

-- 2) payments: only the server (service role) inserts. Anyone could forge rows before.
DROP POLICY IF EXISTS "Coach can insert payments" ON public.payments;

-- 3) bookings: a client books only for their own client row with their own coach (lib/bookings.ts).
DROP POLICY IF EXISTS "Clients can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Client manage booking" ON public.bookings;
DROP POLICY IF EXISTS "Client inserts own booking" ON public.bookings;
CREATE POLICY "Client inserts own booking" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (status = 'confirmed' AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_id AND c.user_id = (select auth.uid()) AND c.coach_id = bookings.coach_id));
DROP POLICY IF EXISTS "Coach can update bookings" ON public.bookings;
CREATE POLICY "Coach can update bookings" ON public.bookings FOR UPDATE TO authenticated
  USING ((select auth.uid()) = coach_id) WITH CHECK ((select auth.uid()) = coach_id);

-- 4) form_submissions: a user can only file forms for themselves / their own client row, never pre-reviewed.
DROP POLICY IF EXISTS "Users submit own forms" ON public.form_submissions;
CREATE POLICY "Users submit own forms" ON public.form_submissions FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id
    AND reviewed_by IS NULL AND reviewed_at IS NULL
    AND (client_id IS NULL OR EXISTS (
      SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.user_id = (select auth.uid()))));

-- 5) client_badges: only for your own client row, or the coach's client (lib/badges.ts runs in the browser).
DROP POLICY IF EXISTS "Coach or system can insert client badges" ON public.client_badges;
DROP POLICY IF EXISTS "Insert badges for own client" ON public.client_badges;
CREATE POLICY "Insert badges for own client" ON public.client_badges FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id
    AND (c.user_id = (select auth.uid()) OR c.coach_id = (select auth.uid()))));

-- 6) checkins: a client cannot pre-fill coach feedback / reviewed fields.
DROP POLICY IF EXISTS "Client submits own checkins" ON public.checkins;
CREATE POLICY "Client submits own checkins" ON public.checkins FOR INSERT TO authenticated
  WITH CHECK (coach_feedback IS NULL AND reviewed_at IS NULL AND reviewed_by IS NULL
    AND EXISTS (SELECT 1 FROM public.clients WHERE id = client_id AND user_id = (select auth.uid())));

-- 7) profiles: users may only change these columns themselves (ProfileMenu name + notifications,
--    reset-password flag). Phone, role etc. change only through the server.
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (name, notifications_enabled, must_reset_password) ON public.profiles TO authenticated;

-- 8) is_coach(): not callable by anonymous visitors.
REVOKE EXECUTE ON FUNCTION public.is_coach() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_coach() TO authenticated;
