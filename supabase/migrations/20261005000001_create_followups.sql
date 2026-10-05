-- Follow-ups: Aman's core daily habit (type + date + one result button).
-- Additive only: new table, nothing existing is changed.
CREATE TABLE IF NOT EXISTS public.followups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'other'
    CHECK (type IN ('checkin', 'payment', 'renewal', 'feedback', 'birthday', 'other')),
  due_date DATE NOT NULL,
  due_time TIME,
  note TEXT,
  result TEXT
    CHECK (result IN ('successful', 'again', 'wrong_number', 'rate_too_high', 'other')),
  done_at TIMESTAMPTZ,
  auto_created BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followups_coach_open
  ON public.followups (coach_id, due_date) WHERE done_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_followups_client ON public.followups (client_id);

ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coach manages own followups" ON public.followups;
CREATE POLICY "Coach manages own followups" ON public.followups
  FOR ALL TO authenticated
  USING ((select auth.uid()) = coach_id)
  WITH CHECK ((select auth.uid()) = coach_id);
