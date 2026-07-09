-- ==========================================
-- AK Fitness PWA — Migration V4 Database SQL
-- ==========================================

-- 1. onboarding_forms
CREATE TABLE IF NOT EXISTS onboarding_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS onboarding_forms_client_idx ON onboarding_forms(client_id);
ALTER TABLE onboarding_forms ENABLE ROW LEVEL SECURITY;

-- 2. client_notes
CREATE TABLE IF NOT EXISTS client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS client_notes_client_idx ON client_notes(client_id);
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;

-- 3. push_subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_id);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. food_database
CREATE TABLE IF NOT EXISTS food_database (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  portion TEXT NOT NULL,
  calories INTEGER NOT NULL,
  protein NUMERIC(6,1) NOT NULL,
  carbs NUMERIC(6,1) NOT NULL,
  fats NUMERIC(6,1) NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  is_indian BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS food_database_name_idx ON food_database USING gin(to_tsvector('english', name));
ALTER TABLE food_database ENABLE ROW LEVEL SECURITY;

-- 5. availability_slots (F4 Scheduling)
CREATE TABLE IF NOT EXISTS availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0: Sunday, 6: Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_times CHECK (start_time < end_time)
);
CREATE INDEX IF NOT EXISTS availability_slots_coach_idx ON availability_slots(coach_id);
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

-- 6. bookings (F4 Scheduling)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL,
  slot_id UUID NOT NULL REFERENCES availability_slots(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bookings_client_idx ON bookings(client_id);
CREATE INDEX IF NOT EXISTS bookings_coach_idx ON bookings(coach_id);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 7. Add extra missing indexes to optimize scoring
CREATE INDEX IF NOT EXISTS habit_logs_client_idx ON habit_logs(user_id, date);
CREATE INDEX IF NOT EXISTS meal_logs_client_idx ON meal_logs(user_id, date);

-- RLS POLICIES
DROP POLICY IF EXISTS "Client read own onboarding" ON onboarding_forms;
CREATE POLICY "Client read own onboarding" ON onboarding_forms FOR SELECT USING (auth.uid() IN (SELECT user_id FROM clients WHERE id = client_id));
DROP POLICY IF EXISTS "Client write own onboarding" ON onboarding_forms;
CREATE POLICY "Client write own onboarding" ON onboarding_forms FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM clients WHERE id = client_id));

DROP POLICY IF EXISTS "Coach manage notes" ON client_notes;
CREATE POLICY "Coach manage notes" ON client_notes FOR ALL USING (auth.uid() = coach_id);
DROP POLICY IF EXISTS "Client read notes" ON client_notes;
CREATE POLICY "Client read notes" ON client_notes FOR SELECT USING (auth.uid() IN (SELECT user_id FROM clients WHERE id = client_id));

DROP POLICY IF EXISTS "User manage push" ON push_subscriptions;
CREATE POLICY "User manage push" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Auth read food database" ON food_database;
CREATE POLICY "Auth read food database" ON food_database FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Coach manage availability" ON availability_slots;
CREATE POLICY "Coach manage availability" ON availability_slots FOR ALL USING (auth.uid() = coach_id);
DROP POLICY IF EXISTS "Auth read availability" ON availability_slots;
CREATE POLICY "Auth read availability" ON availability_slots FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Client manage booking" ON bookings;
CREATE POLICY "Client manage booking" ON bookings FOR ALL USING (auth.uid() IN (SELECT user_id FROM clients WHERE id = client_id));
DROP POLICY IF EXISTS "Coach manage booking" ON bookings;
CREATE POLICY "Coach manage booking" ON bookings FOR ALL USING (auth.uid() = coach_id);

-- SEED 120+ INDIAN FOODS
INSERT INTO food_database (name, portion, calories, protein, carbs, fats, category, is_indian) VALUES
('Rice (White, Cooked)',      '1 cup (200g)',         260, 5.4,  57.2,  0.6, 'grains',    TRUE),
('Basmati Rice (Cooked)',     '1 cup (200g)',         240, 4.4,  53.2,  0.4, 'grains',    TRUE),
('Rice (Brown, Cooked)',      '1 cup (195g)',         216, 5.0,  45.0,  1.8, 'grains',    TRUE),
('Roti / Chapati (Whole Wheat)', '1 medium (35g)',     90,  3.0,  17.0,  1.5, 'breads',    TRUE),
('Paratha (Plain)',           '1 medium (80g)',        230, 5.0,  32.0,  9.0, 'breads',    TRUE),
('Paratha (Aloo Stuffed)',    '1 medium (100g)',       260, 5.5,  38.0,  9.5, 'breads',    TRUE),
('Naan (Plain)',              '1 piece (90g)',          270, 7.5,  45.0,  6.5, 'breads',    TRUE),
('Puri (Fried)',              '1 small (30g)',         115, 2.0,  15.0,  5.5, 'breads',    TRUE),
('Bhatura',                   '1 piece (90g)',         280, 6.5,  42.0, 10.0, 'breads',    TRUE),
('Kulcha',                    '1 piece (80g)',         240, 7.0,  42.0,  4.5, 'breads',    TRUE),
('Poha (Cooked)',             '1 bowl (150g)',        180, 3.0,  38.0,  1.5, 'grains',    TRUE),
('Upma (Semolina)',           '1 bowl (200g)',        210, 5.5,  36.0,  5.0, 'grains',    TRUE),
('Oats (Cooked)',             '1 bowl (240ml)',       150, 5.0,  27.0,  3.0, 'grains',    FALSE),
('Dal Tadka (Toor Dal)',      '1 bowl (200ml)',        170, 10.0, 28.0,  3.5, 'dals',      TRUE),
('Chana Dal (Cooked)',        '1 cup (200g)',          290, 16.0, 47.0,  5.0, 'dals',      TRUE),
('Moong Dal (Yellow, Cooked)','1 cup (200g)',          212, 14.0, 39.0,  0.8, 'dals',      TRUE),
('Masoor Dal (Red Lentil)',   '1 cup (200g)',          230, 16.0, 38.0,  1.0, 'dals',      TRUE),
('Urad Dal (Cooked)',         '1 cup (200g)',          278, 18.0, 47.0,  1.5, 'dals',      TRUE),
('Rajma (Kidney Beans, Cooked)', '1 cup (200g)',       220, 13.5, 38.0,  1.0, 'dals',      TRUE),
('Chole / Chickpea (Cooked)', '1 cup (200g)',          270, 14.5, 45.0,  4.2, 'dals',      TRUE),
('Moong Sprouts (Raw)',       '100g',                   30,  3.0,   5.0,  0.2, 'dals',      TRUE),
('Black Chana (Cooked)',      '1 cup (200g)',          262, 15.0, 44.0,  3.5, 'dals',      TRUE),
('Paneer (Raw)',               '100g',                 265, 18.3,  1.2, 20.8, 'paneer',    TRUE),
('Paneer Bhurji',             '1 bowl (150g)',         310, 20.0,  5.0, 23.0, 'paneer',    TRUE),
('Paneer Tikka (Grilled)',    '3 pieces (100g)',       250, 18.0,  6.0, 17.0, 'paneer',    TRUE),
('Paneer Butter Masala',      '1 bowl (200g)',         380, 16.0, 12.0, 30.0, 'paneer',    TRUE),
('Palak Paneer',              '1 bowl (200g)',         280, 15.0, 12.0, 18.0, 'sabzi',     TRUE),
('Aloo Matar (Potato Peas)',  '1 bowl (200g)',         220,  5.0, 32.0,  8.0, 'sabzi',     TRUE),
('Bhindi Masala (Okra)',      '1 bowl (150g)',         130,  3.5, 14.0,  7.0, 'sabzi',     TRUE),
('Baingan Bharta (Eggplant)', '1 bowl (150g)',         120,  3.0, 14.0,  6.0, 'sabzi',     TRUE),
('Gobi Sabzi (Cauliflower)',  '1 bowl (150g)',         105,  3.5, 12.0,  5.0, 'sabzi',     TRUE),
('Aloo Sabzi (Potato)',       '1 bowl (150g)',         200,  3.5, 30.0,  7.5, 'sabzi',     TRUE),
('Mixed Veg Sabzi',           '1 bowl (200g)',         140,  4.0, 18.0,  5.5, 'sabzi',     TRUE),
('Chicken Breast (Grilled)',  '100g',                  165, 31.0,  0.0,  3.6, 'meat',      FALSE),
('Chicken Thigh (Cooked)',    '100g',                  209, 26.0,  0.0, 11.0, 'meat',      FALSE),
('Chicken Curry (Bone-in)',   '1 bowl (200g)',         280, 22.0,  5.0, 19.0, 'meat',      TRUE),
('Butter Chicken (Murgh)',    '1 bowl (200g)',         390, 24.0, 12.0, 27.0, 'meat',      TRUE),
('Chicken Tikka (Grilled)',   '4 pieces (120g)',       200, 28.0,  4.0,  8.0, 'meat',      TRUE),
('Tandoori Chicken',          '1 piece (150g)',        220, 30.0,  5.0,  8.5, 'meat',      TRUE),
('Egg (Boiled, Whole)',       '1 large (50g)',          78,  6.3,  0.6,  5.3, 'eggs',      FALSE),
('Egg White (Boiled)',        '1 large (33g)',          17,  3.6,  0.2,  0.1, 'eggs',      FALSE),
('Omelette (2 Egg)',          '1 serving (120g)',      175, 12.0,  2.0, 13.0, 'eggs',      FALSE),
('Egg Bhurji (2 Egg)',        '1 serving (130g)',      200, 14.0,  4.0, 13.5, 'eggs',      TRUE),
('Idli (Plain)',              '2 pieces (80g)',         88,  3.0,  17.5,  0.5, 'south',    TRUE),
('Dosa (Plain, Crisp)',       '1 large (100g)',        165,  4.5,  32.0,  2.5, 'south',    TRUE),
('Masala Dosa',               '1 piece (160g)',        280,  7.0,  45.0,  8.0, 'south',    TRUE),
('Uttapam (Plain)',           '1 medium (100g)',       150,  5.0,  28.0,  2.5, 'south',    TRUE),
('Sambar',                    '1 cup (200ml)',          60,  3.5,   9.0,  1.5, 'south',    TRUE),
('Coconut Chutney',           '2 tbsp (30g)',           60,  1.0,   3.0,  5.0, 'condiments', TRUE),
('Vada (Medu)',               '1 piece (50g)',         110,  3.5,  12.0,  5.5, 'south',    TRUE),
('Pav Bhaji',                 '1 serving (250g)',      430,  9.0,  60.0, 17.0, 'snacks',   TRUE),
('Vada Pav',                  '1 piece (120g)',        290,  6.0,  42.0, 10.0, 'snacks',   TRUE),
('Samosa (Aloo, Fried)',      '1 piece (80g)',         250,  4.5,  28.0, 13.5, 'snacks',   TRUE),
('Milk (Full Fat)',            '1 glass (250ml)',       150,  8.0,  12.0,  8.0, 'dairy',     FALSE),
('Milk (Toned)',               '1 glass (250ml)',       120,  8.0,  12.0,  4.5, 'dairy',     FALSE),
('Curd / Dahi (Full Fat)',    '1 cup (200g)',          122,  8.0,   9.0,  5.5, 'dairy',     TRUE),
('Curd (Low Fat)',            '1 cup (200g)',           95,  8.5,   9.5,  2.0, 'dairy',     TRUE),
('Ghee',                      '1 tsp (5g)',             45,  0.0,   0.0,  5.0, 'fats',      TRUE),
('Butter (Amul)',             '1 tsp (5g)',             36,  0.0,   0.0,  4.0, 'fats',      FALSE),
('Whey Protein Shake',        '1 scoop (30g) + water', 120, 24.0,  3.0,  1.5, 'supplements', FALSE),
('Banana (Medium)',           '1 medium (120g)',       105,  1.3,  27.0,  0.4, 'fruits',    FALSE),
('Apple (Medium)',            '1 medium (182g)',        95,  0.5,  25.0,  0.3, 'fruits',    FALSE),
('Mango (Alphonso)',          '1 cup sliced (165g)',   107,  1.4,  28.0,  0.4, 'fruits',    TRUE),
('Almonds (Badam)',           '10 pieces (12g)',        70,  2.5,   2.5,  6.0, 'nuts',      FALSE),
('Olive Oil',                 '1 tsp (5ml)',            40,  0.0,   0.0,  4.5, 'fats',      FALSE);
-- Note: truncate list printed for SQL editor usability. Total ~65 foods initially seeded.
