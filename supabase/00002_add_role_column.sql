-- Add role column to users table for coach/client/admin differentiation

ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'client'
  CHECK (role IN ('client', 'coach', 'admin'));
