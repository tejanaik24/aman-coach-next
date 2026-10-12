BEGIN;

-- 1. Fixed fee per package (#3)
CREATE TABLE IF NOT EXISTS public.package_fees (
  package_name TEXT PRIMARY KEY,
  fee_amount NUMERIC NOT NULL CHECK (fee_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.package_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches manage package_fees" ON public.package_fees;
CREATE POLICY "Coaches manage package_fees"
  ON public.package_fees
  FOR ALL
  TO authenticated
  USING (public.is_coach())
  WITH CHECK (public.is_coach());

DROP POLICY IF EXISTS "Authenticated users read package_fees" ON public.package_fees;
CREATE POLICY "Authenticated users read package_fees"
  ON public.package_fees
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Base package fee on fees (#4, #8, #9) ? no discount_percent column
ALTER TABLE public.fees
  ADD COLUMN IF NOT EXISTS package_fee NUMERIC;

UPDATE public.fees
SET package_fee = amount + COALESCE(discount, 0) - COALESCE(other_charges, 0)
WHERE package_fee IS NULL;

-- 3. Default invoices.upi_id to new UPI ID (#1)
ALTER TABLE public.invoices
  ALTER COLUMN upi_id SET DEFAULT '9815690656@upi';

-- 4. Notifications on/off per user (#21)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- 5. Prevent negative amounts, discounts, or over-payments on fees (#8)
ALTER TABLE public.fees
  DROP CONSTRAINT IF EXISTS fees_non_negative_amounts_check;

ALTER TABLE public.fees
  ADD CONSTRAINT fees_non_negative_amounts_check
  CHECK (
    amount >= 0
    AND COALESCE(amount_paid, 0) >= 0
    AND COALESCE(amount_paid, 0) <= amount
    AND COALESCE(discount, 0) >= 0
  );

-- 6. Indexes for coach dashboard/clients/fees/submissions queries (#22)
CREATE INDEX IF NOT EXISTS idx_clients_coach_id ON public.clients (coach_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients (user_id);
CREATE INDEX IF NOT EXISTS idx_fees_client_status_due ON public.fees (client_id, status, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_client_submitted ON public.checkins (client_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_followups_coach_done_due ON public.followups (coach_id, done_at, due_date);
CREATE INDEX IF NOT EXISTS idx_form_submissions_type_status ON public.form_submissions (form_type, status, submitted_at DESC);

COMMIT;
