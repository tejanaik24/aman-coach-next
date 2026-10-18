-- Migration: Widen followups.type CHECK to include 'plan_update'
ALTER TABLE followups DROP CONSTRAINT IF EXISTS followups_type_check;
ALTER TABLE followups ADD CONSTRAINT followups_type_check CHECK (type = ANY (ARRAY['checkin'::text, 'payment'::text, 'renewal'::text, 'feedback'::text, 'birthday'::text, 'other'::text, 'plan_update'::text]));
