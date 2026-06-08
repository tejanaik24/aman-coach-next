-- Aman Coach — Schema Migration (v2, uses built-in gen_random_uuid)

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  display_name TEXT NOT NULL,
  photo_url   TEXT, phone TEXT,
  role        TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client','coach','admin')),
  coach_id    TEXT NOT NULL DEFAULT '',
  goal        TEXT, height NUMERIC, weight NUMERIC, age INTEGER,
  gender      TEXT CHECK (gender IN ('male','female','other')),
  medical_conditions TEXT, start_date TIMESTAMPTZ,
  plan        TEXT CHECK (plan IN ('basic','premium','elite')),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','inactive')),
  last_checkin TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL, coach_id TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  weight NUMERIC, chest NUMERIC, waist NUMERIC, hips NUMERIC, arms NUMERIC, thighs NUMERIC,
  photos TEXT, energy INTEGER, sleep INTEGER, hunger INTEGER, mood INTEGER, adherence INTEGER,
  notes TEXT, coach_notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL, coach_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  method TEXT NOT NULL DEFAULT 'upi' CHECK (method IN ('upi','cash','bank','other')),
  upi_transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  plan TEXT, month TEXT, invoice_id TEXT, notes TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
  goal TEXT, source TEXT, notes TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','converted','lost')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id TEXT NOT NULL, receiver_id TEXT NOT NULL,
  text TEXT NOT NULL, read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL, coach_id TEXT NOT NULL,
  name TEXT NOT NULL, description TEXT,
  days JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_date TIMESTAMPTZ, end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS diet_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL, coach_id TEXT NOT NULL,
  name TEXT NOT NULL, description TEXT, calories NUMERIC,
  meals JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_date TIMESTAMPTZ, end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('checkin','payment','message','lead','plan','system')),
  read BOOLEAN NOT NULL DEFAULT false, link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
