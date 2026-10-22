-- Plan Maker: Aman builds workout/diet plans inside the app (replaces Google Docs).
-- plan_docs: one row per plan (client plan or template). coach_library: his saved exercises, foods, chips.
-- Coach-only. No anon access. Clients never read these tables; they get the PDF via client_documents.

CREATE TABLE IF NOT EXISTS public.plan_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('workout', 'diet')),
  title text NOT NULL DEFAULT '',
  period_start date,
  period_end date,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_template boolean NOT NULL DEFAULT false,
  sent_at timestamptz,
  document_id uuid REFERENCES public.client_documents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plan_docs_client ON public.plan_docs(client_id, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plan_docs_coach ON public.plan_docs(coach_id, is_template);

ALTER TABLE public.plan_docs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Coach manages own plan docs" ON public.plan_docs;
CREATE POLICY "Coach manages own plan docs" ON public.plan_docs
  FOR ALL TO authenticated
  USING (coach_id = (select auth.uid()) AND public.is_coach())
  WITH CHECK (coach_id = (select auth.uid()) AND public.is_coach());

CREATE TABLE IF NOT EXISTS public.coach_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('exercise', 'warmup', 'food', 'supplement', 'banner', 'sets')),
  name text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  use_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_id, kind, name)
);
CREATE INDEX IF NOT EXISTS idx_coach_library_kind ON public.coach_library(coach_id, kind, use_count DESC);

ALTER TABLE public.coach_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Coach manages own library" ON public.coach_library;
CREATE POLICY "Coach manages own library" ON public.coach_library
  FOR ALL TO authenticated
  USING (coach_id = (select auth.uid()) AND public.is_coach())
  WITH CHECK (coach_id = (select auth.uid()) AND public.is_coach());

REVOKE ALL ON public.plan_docs, public.coach_library FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_docs, public.coach_library TO authenticated;
