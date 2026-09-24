-- Tracks sent automation reminders to prevent duplicate sends within a time window
CREATE TABLE IF NOT EXISTS public.reminder_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminder_log_client_type_sent
  ON public.reminder_log (client_id, reminder_type, sent_at);

-- Written only by the service role from automation routes; no public policies
ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;
