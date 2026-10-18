-- Migration: Add EMI support to clients and fees
ALTER TABLE clients ADD COLUMN IF NOT EXISTS emi_allowed boolean DEFAULT false;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS emi_group uuid NULL;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS emi_no int NULL;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS emi_total int NULL;