-- 1. Create Coach Availability Table
CREATE TABLE IF NOT EXISTS public.availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday..6=Saturday
  start_time TIME NOT NULL DEFAULT '09:00:00',
  end_time TIME NOT NULL DEFAULT '18:00:00',
  slot_duration_mins INT NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Client Call Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read availability" ON public.availability
  FOR SELECT USING (true);

CREATE POLICY "Coach can manage availability" ON public.availability
  FOR ALL USING (auth.uid() = coach_id);

CREATE POLICY "Clients can view and insert own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.clients WHERE id = bookings.client_id) OR auth.uid() = coach_id);

CREATE POLICY "Clients can insert bookings" ON public.bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Coach can update bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = coach_id);
