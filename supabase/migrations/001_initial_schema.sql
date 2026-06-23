-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('coach', 'client')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT TO authenticated USING ((select auth.uid()) = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING ((select auth.uid()) = id);
CREATE POLICY "Coach can view all client profiles" ON profiles FOR SELECT TO authenticated USING (
  role = 'client' AND EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'coach')
);

-- CLIENTS
CREATE TABLE clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES profiles(id),
  goal TEXT,
  package_name TEXT,
  fee_amount NUMERIC DEFAULT 0,
  fee_currency TEXT DEFAULT 'INR',
  fee_due_day INTEGER DEFAULT 1,
  start_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_clients_coach_id ON clients(coach_id);
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE POLICY "Coach sees own clients" ON clients FOR ALL TO authenticated USING ((select auth.uid()) = coach_id);
CREATE POLICY "Client sees own record" ON clients FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

-- WORKOUT PLANS
CREATE TABLE workout_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  weeks INTEGER DEFAULT 4,
  is_active BOOLEAN DEFAULT true,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_workout_plans_client_id ON workout_plans(client_id);
CREATE POLICY "Coach manages plans" ON workout_plans FOR ALL TO authenticated USING ((select auth.uid()) = coach_id);
CREATE POLICY "Client views own plans" ON workout_plans FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM clients WHERE id = client_id AND user_id = (select auth.uid()))
);

-- WORKOUT DAYS
CREATE TABLE workout_days (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  plan_id UUID REFERENCES workout_plans(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  day_name TEXT NOT NULL,
  focus TEXT
);
ALTER TABLE workout_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inherit from plan - coach" ON workout_days FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM workout_plans WHERE id = plan_id AND coach_id = (select auth.uid()))
);
CREATE POLICY "Inherit from plan - client" ON workout_days FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM workout_plans wp
    JOIN clients c ON c.id = wp.client_id
    WHERE wp.id = plan_id AND c.user_id = (select auth.uid())
  )
);

-- EXERCISES
CREATE TABLE exercises (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  day_id UUID REFERENCES workout_days(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sets INTEGER,
  reps TEXT,
  weight TEXT,
  rest_seconds INTEGER,
  video_url TEXT,
  notes TEXT,
  order_index INTEGER DEFAULT 0
);
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Exercises via day via plan - coach" ON exercises FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM workout_days wd
    JOIN workout_plans wp ON wp.id = wd.plan_id
    WHERE wd.id = day_id AND wp.coach_id = (select auth.uid())
  )
);
CREATE POLICY "Exercises via day via plan - client" ON exercises FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM workout_days wd
    JOIN workout_plans wp ON wp.id = wd.plan_id
    JOIN clients c ON c.id = wp.client_id
    WHERE wd.id = day_id AND c.user_id = (select auth.uid())
  )
);

-- NUTRITION PLANS
CREATE TABLE nutrition_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES profiles(id),
  total_calories INTEGER,
  protein_g INTEGER,
  carbs_g INTEGER,
  fats_g INTEGER,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_nutrition_plans_client_id ON nutrition_plans(client_id);
CREATE POLICY "Coach manages nutrition" ON nutrition_plans FOR ALL TO authenticated USING ((select auth.uid()) = coach_id);
CREATE POLICY "Client views nutrition" ON nutrition_plans FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM clients WHERE id = client_id AND user_id = (select auth.uid()))
);

-- MEALS
CREATE TABLE meals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  plan_id UUID REFERENCES nutrition_plans(id) ON DELETE CASCADE,
  meal_name TEXT NOT NULL,
  meal_time TEXT,
  foods JSONB DEFAULT '[]',
  total_calories INTEGER,
  order_index INTEGER DEFAULT 0
);
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Meals via plan - coach" ON meals FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM nutrition_plans WHERE id = plan_id AND coach_id = (select auth.uid()))
);
CREATE POLICY "Meals via plan - client" ON meals FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM nutrition_plans np
    JOIN clients c ON c.id = np.client_id
    WHERE np.id = plan_id AND c.user_id = (select auth.uid())
  )
);

-- CHECK-INS
CREATE TABLE checkins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  week_number INTEGER,
  weight NUMERIC,
  body_fat NUMERIC,
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 10),
  adherence_workout INTEGER CHECK (adherence_workout BETWEEN 1 AND 10),
  adherence_nutrition INTEGER CHECK (adherence_nutrition BETWEEN 1 AND 10),
  notes TEXT,
  coach_feedback TEXT,
  photos TEXT[] DEFAULT '{}',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id)
);
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_checkins_client_id ON checkins(client_id);
CREATE INDEX idx_checkins_submitted_at ON checkins(submitted_at);
CREATE POLICY "Client submits own checkins" ON checkins FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM clients WHERE id = client_id AND user_id = (select auth.uid()))
);
CREATE POLICY "Client views own checkins" ON checkins FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM clients WHERE id = client_id AND user_id = (select auth.uid()))
);
CREATE POLICY "Coach manages all checkins" ON checkins FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM clients WHERE id = client_id AND coach_id = (select auth.uid()))
);

-- FEES
CREATE TABLE fees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'INR',
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  reminder_sent_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_fees_client_id ON fees(client_id);
CREATE INDEX idx_fees_status ON fees(status);
CREATE INDEX idx_fees_due_date ON fees(due_date);
CREATE POLICY "Coach manages fees" ON fees FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM clients WHERE id = client_id AND coach_id = (select auth.uid()))
);
CREATE POLICY "Client views own fees" ON fees FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM clients WHERE id = client_id AND user_id = (select auth.uid()))
);

-- AUTOMATION LOGS
CREATE TABLE automation_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  payload JSONB,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_automation_logs_client_id ON automation_logs(client_id);
CREATE INDEX idx_automation_logs_type ON automation_logs(type);
CREATE POLICY "Coach views automation logs" ON automation_logs FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'coach')
);

-- TRIGGER: auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
