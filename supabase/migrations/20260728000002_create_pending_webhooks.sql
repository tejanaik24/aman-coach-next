-- Outbound webhook delivery queue with retry tracking
CREATE TABLE IF NOT EXISTS public.pending_webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  next_retry_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_webhooks_status_retry
  ON public.pending_webhooks (status, next_retry_at);

-- Written only by the service role from server code; no public policies
ALTER TABLE public.pending_webhooks ENABLE ROW LEVEL SECURITY;
