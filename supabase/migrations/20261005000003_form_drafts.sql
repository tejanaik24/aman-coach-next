-- Half-finished client forms saved on the server (continue on another phone). Additive only.
CREATE TABLE IF NOT EXISTS public.form_drafts (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL CHECK (form_type IN ('standard_joining', 'antenatal_joining', 'checkin')),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, form_type)
);

ALTER TABLE public.form_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own drafts" ON public.form_drafts;
CREATE POLICY "Users manage own drafts" ON public.form_drafts
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
