-- Add form_types for the remaining public marketing-site pages (PAR-Q, contract).
ALTER TABLE public.form_submissions DROP CONSTRAINT IF EXISTS form_submissions_form_type_check;
ALTER TABLE public.form_submissions ADD CONSTRAINT form_submissions_form_type_check
  CHECK (form_type IN ('standard_joining', 'antenatal_joining', 'checkin', 'consultation_booking', 'enquiry', 'feedback', 'par_q', 'coaching_contract'));
