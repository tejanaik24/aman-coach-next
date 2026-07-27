-- form_submissions never actually existed on the live DB — creating it now with
-- both the original client-onboarding form types and the new public marketing-site
-- form types included from the start (no separate ALTER step needed).

CREATE TABLE IF NOT EXISTS public.form_submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL CHECK (form_type IN ('standard_joining', 'antenatal_joining', 'checkin', 'consultation_booking', 'enquiry', 'feedback')),
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'archived')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_form_submissions_client_id ON public.form_submissions(client_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON public.form_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_type ON public.form_submissions(form_type);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_at ON public.form_submissions(submitted_at);

DROP POLICY IF EXISTS "Users submit own forms" ON public.form_submissions;
CREATE POLICY "Users submit own forms" ON public.form_submissions
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users view own forms" ON public.form_submissions;
CREATE POLICY "Users view own forms" ON public.form_submissions
  FOR SELECT TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR EXISTS (SELECT 1 FROM public.clients WHERE id = client_id AND user_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "Coach manages all forms" ON public.form_submissions;
CREATE POLICY "Coach manages all forms" ON public.form_submissions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'coach')
    OR EXISTS (SELECT 1 FROM public.clients WHERE id = client_id AND coach_id = (select auth.uid()))
  );
