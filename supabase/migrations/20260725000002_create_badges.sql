-- 1. Create Badges Definition Table
CREATE TABLE IF NOT EXISTS public.badges (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'milestone',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Client Badges Table
CREATE TABLE IF NOT EXISTS public.client_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  notified BOOLEAN DEFAULT FALSE,
  UNIQUE(client_id, badge_id)
);

-- RLS Policies for Badges
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read badges" ON public.badges
  FOR SELECT USING (true);

CREATE POLICY "Clients can read own badges" ON public.client_badges
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM public.clients WHERE id = client_badges.client_id
  ) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coach'
  ));

CREATE POLICY "Coach or system can insert client badges" ON public.client_badges
  FOR INSERT WITH CHECK (true);

-- Seed Default 8 Badge Definitions
INSERT INTO public.badges (id, slug, title, description, icon, category) VALUES
  ('first_checkin', 'first-checkin', 'First Check-in', 'Submitted your first weekly check-in form', 'CheckCircle2', 'milestone'),
  ('streak_4w', 'streak-4w', '4-Week Streak', 'Completed 4 consecutive weekly check-ins', 'Flame', 'streak'),
  ('streak_8w', 'streak-8w', '8-Week Streak', 'Completed 8 consecutive weekly check-ins', 'Trophy', 'streak'),
  ('streak_12w', 'streak-12w', '12-Week Master', 'Completed 12 consecutive weekly check-ins', 'Crown', 'streak'),
  ('weight_loss_5kg', 'weight-loss-5kg', '5kg Milestone', 'Achieved your first 5kg weight loss', 'Scale', 'progress'),
  ('workout_80', 'workout-80', 'Iron Commitment', 'Achieved 80%+ workout completion rate', 'Dumbbell', 'performance'),
  ('diet_90', 'diet-90', 'Nutrition Master', 'Maintained 90%+ diet adherence', 'Utensils', 'performance'),
  ('first_plan', 'first-plan', 'Plan Activated', 'Received your custom nutrition or workout plan', 'Sparkles', 'milestone')
ON CONFLICT (id) DO NOTHING;
