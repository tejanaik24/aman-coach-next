-- Idempotency ledger for scheduled communications. A workflow writes here only
-- after every delivery step in that reminder has succeeded.
CREATE TABLE IF NOT EXISTS public.automation_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_type, entity_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_automation_deliveries_entity
  ON public.automation_deliveries (entity_type, entity_id, event_type);

ALTER TABLE public.automation_deliveries ENABLE ROW LEVEL SECURITY;
