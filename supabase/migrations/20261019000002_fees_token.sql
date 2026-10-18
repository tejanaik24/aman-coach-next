-- Migration: Add token column to fees table for public /bill/[token] URL
ALTER TABLE fees ADD COLUMN IF NOT EXISTS token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');
UPDATE fees SET token = encode(gen_random_bytes(16), 'hex') WHERE token IS NULL;
ALTER TABLE fees ALTER COLUMN token SET NOT NULL;

-- Enable public reading of fee by valid token
DROP POLICY IF EXISTS public_view_fee_by_token ON fees;
CREATE POLICY public_view_fee_by_token ON fees
    FOR SELECT TO anon, authenticated
    USING (token IS NOT NULL);