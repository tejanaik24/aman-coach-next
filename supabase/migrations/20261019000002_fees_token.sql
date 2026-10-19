-- Migration: Add token column to fees table for public /bill/[token] URL
ALTER TABLE fees ADD COLUMN IF NOT EXISTS token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');
UPDATE fees SET token = encode(gen_random_bytes(16), 'hex') WHERE token IS NULL;
ALTER TABLE fees ALTER COLUMN token SET NOT NULL;