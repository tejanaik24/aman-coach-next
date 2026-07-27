-- Storage bucket for consultation-booking payment screenshots (private, service-role only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('consultation-proofs', 'consultation-proofs', false)
ON CONFLICT (id) DO NOTHING;
