-- Workout / diet plans as PDFs (Aman's real workflow): upload once, send to a client, or save as a reusable template.
-- Additive only.
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.client_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE, -- NULL = saved template
  kind TEXT NOT NULL CHECK (kind IN ('workout', 'diet')),
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  note TEXT,
  is_template BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_documents_client ON public.client_documents (client_id, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_documents_templates ON public.client_documents (coach_id, kind) WHERE is_template;

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coach manages own documents" ON public.client_documents;
CREATE POLICY "Coach manages own documents" ON public.client_documents
  FOR ALL TO authenticated
  USING ((select auth.uid()) = coach_id)
  WITH CHECK ((select auth.uid()) = coach_id);

DROP POLICY IF EXISTS "Client views own documents" ON public.client_documents;
CREATE POLICY "Client views own documents" ON public.client_documents
  FOR SELECT TO authenticated
  USING (
    client_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.user_id = (select auth.uid()))
  );
