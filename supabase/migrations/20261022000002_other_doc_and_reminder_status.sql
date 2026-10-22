-- Migration: 20261022000002_other_doc_and_reminder_status.sql
-- 1. Widen client_documents.kind CHECK constraint to include 'other'
-- 2. Support delivery tracking and direct messages on reminder_log
-- 3. Enable coach authenticated SELECT on reminder_log

BEGIN;

-- 1. client_documents.kind 'other'
ALTER TABLE public.client_documents DROP CONSTRAINT IF EXISTS client_documents_kind_check;
ALTER TABLE public.client_documents ADD CONSTRAINT client_documents_kind_check
  CHECK (kind IN ('workout', 'diet', 'cycle', 'other'));

-- 2. reminder_log nullable client_id (for messaging any number)
ALTER TABLE public.reminder_log ALTER COLUMN client_id DROP NOT NULL;

-- 3. reminder_log delivery tracking columns
ALTER TABLE public.reminder_log ADD COLUMN IF NOT EXISTS message_id TEXT;
ALTER TABLE public.reminder_log ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
ALTER TABLE public.reminder_log ADD COLUMN IF NOT EXISTS error TEXT;
ALTER TABLE public.reminder_log ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.reminder_log ADD COLUMN IF NOT EXISTS followup_id UUID REFERENCES public.followups(id) ON DELETE SET NULL;
ALTER TABLE public.reminder_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Performance indexes
CREATE INDEX IF NOT EXISTS idx_reminder_log_message_id ON public.reminder_log(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reminder_log_followup_id ON public.reminder_log(followup_id) WHERE followup_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reminder_log_status_sent_at ON public.reminder_log(status, sent_at);

-- 5. Coach read policy for authenticated coach users
DROP POLICY IF EXISTS "Coach reads reminder_log" ON public.reminder_log;
CREATE POLICY "Coach reads reminder_log"
  ON public.reminder_log
  FOR SELECT
  TO authenticated
  USING (public.is_coach());

COMMIT;
