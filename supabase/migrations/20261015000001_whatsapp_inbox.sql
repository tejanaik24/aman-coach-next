-- WhatsApp inbox: every message sent to the business number is saved here, with proof
-- of whether it reached Aman's personal WhatsApp. Additive only: new table.
-- Rows are written by the webhook (service role). The coach can read and mark read.
CREATE TABLE IF NOT EXISTS public.whatsapp_inbound (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wa_message_id TEXT NOT NULL UNIQUE,            -- Meta message id; UNIQUE = no double saves on retries
  from_phone TEXT NOT NULL,                      -- digits only, e.g. 919885382525
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  msg_type TEXT NOT NULL DEFAULT 'text',
  body TEXT,
  media_id TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  forward_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (forward_status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  forward_method TEXT CHECK (forward_method IN ('text', 'template')),
  forward_wamid TEXT,                            -- id of OUR message to Aman; delivery updates match on this
  forward_error TEXT,
  ack_sent_at TIMESTAMPTZ,
  read_by_coach_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_coach_recent
  ON public.whatsapp_inbound (coach_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_forward_wamid
  ON public.whatsapp_inbound (forward_wamid) WHERE forward_wamid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_from
  ON public.whatsapp_inbound (from_phone, received_at DESC);

ALTER TABLE public.whatsapp_inbound ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coach reads own inbound" ON public.whatsapp_inbound;
CREATE POLICY "Coach reads own inbound" ON public.whatsapp_inbound
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = coach_id);

DROP POLICY IF EXISTS "Coach marks own inbound read" ON public.whatsapp_inbound;
CREATE POLICY "Coach marks own inbound read" ON public.whatsapp_inbound
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = coach_id)
  WITH CHECK ((select auth.uid()) = coach_id);
