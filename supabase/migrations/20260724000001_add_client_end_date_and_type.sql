ALTER TABLE clients ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_type TEXT NOT NULL DEFAULT 'standard' CHECK (client_type IN ('standard', 'antenatal'));
