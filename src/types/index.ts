export type AuthUser = Profile

export interface Profile {
  id: string
  name: string
  phone: string | null
  role: "coach" | "client"
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  user_id: string | null
  coach_id: string | null
  goal: string | null
  package_name: string | null
  fee_amount: number
  fee_currency: string
  fee_due_day: number
  start_date: string
  end_date: string | null
  client_type: "standard" | "antenatal"
  status: "active" | "paused" | "inactive"
  notes: string | null
  created_at: string
}

export interface ClientWithProfile extends Client {
  profile: Profile | null
}

export interface WorkoutPlan {
  id: string
  client_id: string
  coach_id: string
  name: string
  weeks: number
  is_active: boolean
  is_template: boolean
  created_at: string
}

export interface WorkoutDay {
  id: string
  plan_id: string
  day_number: number
  day_name: string
  focus: string | null
}

export interface Exercise {
  id: string
  day_id: string
  name: string
  sets: number | null
  reps: string | null
  weight: string | null
  rest_seconds: number | null
  video_url: string | null
  notes: string | null
  order_index: number
}

export interface NutritionPlan {
  id: string
  client_id: string
  coach_id: string
  total_calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fats_g: number | null
  is_active: boolean
  notes: string | null
  created_at: string
}

export interface Meal {
  id: string
  plan_id: string
  meal_name: string
  meal_time: string | null
  foods: Record<string, unknown>[]
  total_calories: number | null
  order_index: number
}

export interface CheckinFormData {
  training: {
    energy_workout: number | null
    days_worked_out: number | null
    workout_deviation: string
    exercise_issues: string
    cardio_achieved: string
    injury_pain: string
  }
  diet: {
    diet_deviation: string
    appetite: string
    digestion: string
    constipation: string
    diet_changes_wanted: string
    food_add_remove: string
  }
  general: {
    energy_day: number | null
    sleep_quality: string
    water_intake: number | null
    urine_colour: string
    coaching_feedback: string
    other_notes: string
  }
  measurements: {
    weight: number | null
    abdomen: number | null
    hips: number | null
  }
  photos: {
    front_url: string | null
    back_url: string | null
    left_url: string | null
    right_url: string | null
    favourite_url: string | null
    mandatory_url: string | null
  }
}

export interface Checkin {
  id: string
  client_id: string
  week_number: number | null
  weight: number | null
  body_fat: number | null
  energy_level: number | null
  sleep_quality: number | null
  adherence_workout: number | null
  adherence_nutrition: number | null
  notes: string | null
  coach_feedback: string | null
  photos: string[]
  form_data: CheckinFormData | null
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

export interface Fee {
  id: string
  client_id: string
  amount: number
  currency: string
  due_date: string
  paid_date: string | null
  status: "pending" | "paid" | "overdue"
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  reminder_sent_at: string | null
  notes: string | null
  created_at: string
}

export interface AutomationLog {
  id: string
  type: string
  client_id: string | null
  payload: Record<string, unknown> | null
  status: "sent" | "failed" | "skipped"
  error_message: string | null
  sent_at: string
}

export interface CoachStats {
  totalClients: number
  activeClients: number
  pendingCheckins: number
  feesDue: number
  monthlyRevenue: number
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, "created_at" | "updated_at">
        Update: Partial<Omit<Profile, "id">>
      }
      clients: {
        Row: Client
        Insert: Omit<Client, "id" | "created_at">
        Update: Partial<Omit<Client, "id">>
      }
      workout_plans: {
        Row: WorkoutPlan
        Insert: Omit<WorkoutPlan, "id" | "created_at">
        Update: Partial<Omit<WorkoutPlan, "id">>
      }
      workout_days: {
        Row: WorkoutDay
        Insert: Omit<WorkoutDay, "id">
        Update: Partial<Omit<WorkoutDay, "id">>
      }
      exercises: {
        Row: Exercise
        Insert: Omit<Exercise, "id">
        Update: Partial<Omit<Exercise, "id">>
      }
      nutrition_plans: {
        Row: NutritionPlan
        Insert: Omit<NutritionPlan, "id" | "created_at">
        Update: Partial<Omit<NutritionPlan, "id">>
      }
      meals: {
        Row: Meal
        Insert: Omit<Meal, "id">
        Update: Partial<Omit<Meal, "id">>
      }
      checkins: {
        Row: Checkin
        Insert: Omit<Checkin, "id" | "submitted_at">
        Update: Partial<Omit<Checkin, "id">>
      }
      fees: {
        Row: Fee
        Insert: Omit<Fee, "id" | "created_at">
        Update: Partial<Omit<Fee, "id">>
      }
      automation_logs: {
        Row: AutomationLog
        Insert: Omit<AutomationLog, "id" | "sent_at">
        Update: Partial<Omit<AutomationLog, "id">>
      }
    }
  }
}

export interface CoachAvailabilitySlot {
  id: string
  coachId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isAvailable: boolean
  createdAt: Date
}

export interface Appointment {
  id: string
  clientId: string
  coachId: string
  date: string
  startTime: string
  endTime: string
  status: "scheduled" | "completed" | "cancelled"
  notes?: string
  createdAt: Date
  updatedAt: Date
}

