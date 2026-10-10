-- Contest-prep clients get a third PDF next to workout + diet: the "cycle" plan.
-- Additive: only widens the allowed values. Existing rows are untouched.
ALTER TABLE public.client_documents DROP CONSTRAINT IF EXISTS client_documents_kind_check;
ALTER TABLE public.client_documents ADD CONSTRAINT client_documents_kind_check
  CHECK (kind IN ('workout', 'diet', 'cycle'));
