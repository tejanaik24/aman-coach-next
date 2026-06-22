-- Aman Coach — Schema Migration v3 (Meal Logging, Habits, Wearables, Scheduling)

-- F1: Meal Logging
CREATE TABLE IF NOT EXISTS meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_name TEXT NOT NULL CHECK (meal_name IN ('breakfast','lunch','dinner','snack')),
  foods JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_calories NUMERIC NOT NULL DEFAULT 0,
  total_protein NUMERIC NOT NULL DEFAULT 0,
  total_carbs NUMERIC NOT NULL DEFAULT 0,
  total_fats NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON meal_logs(user_id, date);

CREATE TABLE IF NOT EXISTS food_database (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  portion TEXT NOT NULL DEFAULT '',
  calories NUMERIC NOT NULL DEFAULT 0,
  protein NUMERIC NOT NULL DEFAULT 0,
  carbs NUMERIC NOT NULL DEFAULT 0,
  fats NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'other',
  is_common BOOLEAN NOT NULL DEFAULT false
);

INSERT INTO food_database (name, portion, calories, protein, carbs, fats, category, is_common) VALUES
  ('Rice (cooked)', '1 cup (200g)', 260, 4.2, 57, 0.4, 'grain', true),
  ('Chapati / Roti', '1 medium (40g)', 120, 3.5, 20, 2.5, 'grain', true),
  ('Dal (cooked)', '1 cup (200g)', 180, 12, 30, 2, 'protein', true),
  ('Chicken Breast (grilled)', '150g', 247, 46, 0, 5.3, 'protein', true),
  ('Egg (whole)', '1 large (50g)', 72, 6.3, 0.4, 4.8, 'protein', true),
  ('Egg White', '1 large (33g)', 17, 3.6, 0.2, 0, 'protein', true),
  ('Paneer', '100g', 265, 18, 1.2, 21, 'protein', true),
  ('Banana', '1 medium (120g)', 105, 1.3, 27, 0.4, 'fruit', true),
  ('Apple', '1 medium (180g)', 95, 0.5, 25, 0.3, 'fruit', true),
  ('Oats (rolled)', '50g', 194, 6.5, 33, 3.5, 'grain', true),
  ('Milk (whole)', '1 cup (250ml)', 150, 8, 12, 8, 'dairy', true),
  ('Curd / Yogurt', '1 cup (200g)', 120, 10, 8, 5, 'dairy', true),
  ('Whey Protein', '1 scoop (30g)', 120, 24, 2, 1.5, 'protein', true),
  ('Bread (brown)', '1 slice (30g)', 75, 2.5, 13, 1, 'grain', true),
  ('Potato (boiled)', '1 medium (150g)', 130, 3, 30, 0.2, 'vegetable', true),
  ('Sweet Potato', '1 medium (150g)', 150, 3.5, 35, 0.5, 'vegetable', true),
  ('Almonds', '10 pieces (12g)', 70, 2.5, 2.5, 6, 'snack', true),
  ('Peanut Butter', '1 tbsp (16g)', 95, 4, 3.5, 8, 'snack', true),
  ('Ghee', '1 tsp (5g)', 45, 0, 0, 5, 'dairy', true),
  ('Olive Oil', '1 tbsp (15ml)', 120, 0, 0, 13.5, 'fat', true),
  ('Idli', '2 pieces (80g)', 160, 5, 36, 0.4, 'grain', true),
  ('Dosa', '1 medium (80g)', 140, 3.5, 28, 3, 'grain', true),
  ('Sambar', '1 cup (200g)', 120, 6, 20, 2, 'protein', true),
  ('Poha', '1 cup (150g)', 250, 5, 45, 6, 'grain', true),
  ('Upma', '1 cup (150g)', 230, 5, 38, 7, 'grain', true),
  ('Fish (Salmon)', '150g', 280, 30, 0, 17, 'protein', true),
  ('Rajma (cooked)', '1 cup (200g)', 200, 12, 35, 1, 'protein', true),
  ('Chole (cooked)', '1 cup (200g)', 210, 12, 35, 4, 'protein', true),
  ('Avocado', '1/2 medium (75g)', 120, 1.5, 6.5, 11, 'fruit', true),
  ('Green Salad', '1 bowl (100g)', 25, 1.5, 4, 0.3, 'vegetable', true),
  ('Tofu (firm)', '100g', 76, 8, 1.5, 4.5, 'protein', true),
  ('Quinoa (cooked)', '1 cup (185g)', 220, 8, 39, 3.5, 'grain', true),
  ('Brown Rice (cooked)', '1 cup (200g)', 240, 5, 52, 1.5, 'grain', true),
  ('Mango', '1 medium (200g)', 120, 1, 30, 0.5, 'fruit', true),
  ('Coconut Water', '1 cup (250ml)', 45, 0.5, 9, 0, 'fruit', true),
  ('Buttermilk / Chaas', '1 cup (250ml)', 60, 3, 8, 2, 'dairy', true),
  ('Green Tea', '1 cup (250ml)', 2, 0, 0.5, 0, 'other', true),
  ('Black Coffee', '1 cup (250ml)', 3, 0.3, 0, 0, 'other', true),
  ('Mixed Nuts', '30g', 180, 5, 6, 16, 'snack', true),
  ('Dark Chocolate (70%)', '30g', 170, 2, 13, 12, 'snack', true);

-- F2: Habit Tracking
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '✅',
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('hydration','movement','mindfulness','nutrition','sleep','other')),
  color TEXT NOT NULL DEFAULT '#7C3AED',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  value NUMERIC NOT NULL DEFAULT 1,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(habit_id, user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON habit_logs(user_id, date);

-- F3: Wearable Metrics
CREATE TABLE IF NOT EXISTS wearable_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','fitbit','google_fit','apple_health')),
  steps INTEGER,
  heart_rate_avg NUMERIC,
  sleep_hours NUMERIC,
  calories_burned NUMERIC,
  active_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, source)
);

CREATE INDEX IF NOT EXISTS idx_wearable_user_date ON wearable_metrics(user_id, date);

-- F4: Scheduling
CREATE TABLE IF NOT EXISTS coach_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_availability_coach ON coach_availability(coach_id);

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  coach_id TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_coach ON appointments(coach_id, date);
