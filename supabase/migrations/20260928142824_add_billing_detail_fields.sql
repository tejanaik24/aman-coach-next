-- Sequential, human-friendly member numbers for clients
CREATE SEQUENCE IF NOT EXISTS client_member_number_seq;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS member_number INTEGER;
ALTER TABLE clients ALTER COLUMN member_number SET DEFAULT nextval('client_member_number_seq');
-- backfill any existing clients that don't have one yet, oldest first
UPDATE clients SET member_number = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM clients WHERE member_number IS NULL
) sub
WHERE clients.id = sub.id AND clients.member_number IS NULL;
-- keep the sequence ahead of any backfilled values
SELECT setval('client_member_number_seq', GREATEST((SELECT COALESCE(MAX(member_number), 0) FROM clients), 1));

-- Sequential, zero-padded invoice numbers ("00044")
CREATE SEQUENCE IF NOT EXISTS fee_invoice_number_seq;

-- Real billing-detail fields on fees, used to build the full invoice/receipt
ALTER TABLE fees ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS other_charges NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS discount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS reward_points_redeemed NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS amount_paid NUMERIC NOT NULL DEFAULT 0;

-- backfill invoice_number for existing fee rows, oldest first
UPDATE fees SET invoice_number = LPAD(sub.rn::text, 5, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM fees WHERE invoice_number IS NULL
) sub
WHERE fees.id = sub.id AND fees.invoice_number IS NULL;
SELECT setval('fee_invoice_number_seq', GREATEST((SELECT COUNT(*) FROM fees), 0));

ALTER TABLE fees ADD CONSTRAINT fees_invoice_number_unique UNIQUE (invoice_number);

ALTER TABLE fees ALTER COLUMN invoice_number SET DEFAULT LPAD(nextval('fee_invoice_number_seq')::text, 5, '0');
