export interface AppUser {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  phone?: string
  role: "client" | "coach" | "admin"
  createdAt: Date
  updatedAt: Date
}

export interface Client extends AppUser {
  role: "client"
  coachId: string
  goal?: string
  height?: number
  weight?: number
  age?: number
  gender?: "male" | "female" | "other"
  medicalConditions?: string
  startDate: Date
  endDate?: Date
  plan?: "basic" | "premium" | "elite"
  status: "active" | "paused" | "inactive"
  lastCheckin?: Date
  coachNotes?: string
}

export interface CheckinFeedback {
  workoutEnergy?: string
  workoutDays?: number
  workoutDeviation?: string
  exerciseIssues?: string
  cardioAchievement?: string
  dietDeviation?: string
  appetite?: string
  digestion?: string
  stoolFrequency?: string
  dietChangeRequest?: string
  foodAddRemove?: string
  dailyEnergy?: string
  sleepQuality?: string
  waterIntake?: string
  urineColor?: string
  coachingFeeling?: string
}

export interface Checkin {
  id: string
  clientId: string
  coachId: string
  date: Date
  weight?: number
  abdomen?: number
  hips?: number
  measurements?: {
    chest?: number
    waist?: number
    hips?: number
    arms?: number
    thighs?: number
  }
  photos?: string[]
  energy?: number
  sleep?: number
  hunger?: number
  mood?: number
  adherence?: number
  notes?: string
  coachNotes?: string
  feedback?: CheckinFeedback
  createdAt: Date
}

export interface Payment {
  id: string
  clientId: string
  coachId: string
  amount: number
  currency: string
  method: "upi" | "cash" | "bank" | "other"
  upiTransactionId?: string
  status: "pending" | "completed" | "failed" | "refunded"
  plan?: string
  month?: string
  invoiceId?: string
  notes?: string
  date: Date
  createdAt: Date
}

export interface Lead {
  id: string
  name: string
  email: string
  phone: string
  goal?: string
  source?: string
  status: "new" | "contacted" | "qualified" | "converted" | "lost"
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface Message {
  id: string
  senderId: string
  receiverId: string
  text: string
  read: boolean
  createdAt: Date
}

export interface WorkoutPlan {
  id: string
  clientId: string
  coachId: string
  name: string
  description?: string
  days: WorkoutDay[]
  startDate?: Date
  endDate?: Date
  createdAt: Date
  updatedAt: Date
}

export interface WorkoutDay {
  day: string
  exercises: Exercise[]
}

export interface Exercise {
  name: string
  sets: number
  reps: number
  weight?: number
  rest?: string
  notes?: string
}

export interface DietPlan {
  id: string
  clientId: string
  coachId: string
  name: string
  description?: string
  calories?: number
  meals: Meal[]
  startDate?: Date
  endDate?: Date
  createdAt: Date
  updatedAt: Date
}

export interface Meal {
  name: string
  time?: string
  foods: FoodItem[]
}

export interface FoodItem {
  name: string
  portion: string
  calories?: number
  protein?: number
  carbs?: number
  fats?: number
}

export interface ProgressData {
  date: Date
  weight?: number
  bodyFat?: number
  chest?: number
  waist?: number
  hips?: number
  arms?: number
  thighs?: number
}

export interface Analytics {
  totalClients: number
  activeClients: number
  totalRevenue: number
  monthlyRevenue: number
  newLeads: number
  conversionRate: number
  checkinRate: number
  revenueByMonth: { month: string; amount: number }[]
  clientGrowth: { month: string; count: number }[]
}

export interface Notification {
  id: string
  userId: string
  title: string
  body: string
  type: "checkin" | "payment" | "message" | "lead" | "plan" | "system"
  read: boolean
  link?: string
  createdAt: Date
}

export interface MealLog {
  id: string
  userId: string
  date: string
  mealName: "breakfast" | "lunch" | "dinner" | "snack"
  foods: FoodItem[]
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFats: number
  createdAt: Date
}

export interface FoodDatabaseItem {
  id: string
  name: string
  portion: string
  calories: number
  protein: number
  carbs: number
  fats: number
  category: string
  isCommon: boolean
}

export interface Habit {
  id: string
  userId: string
  name: string
  icon: string
  category: "hydration" | "movement" | "mindfulness" | "nutrition" | "sleep" | "other"
  color: string
  sortOrder: number
  createdAt: Date
}

export interface HabitLog {
  id: string
  habitId: string
  userId: string
  date: string
  value: number
  note?: string
  createdAt: Date
}

export interface WearableMetric {
  id: string
  userId: string
  date: string
  source: "manual" | "fitbit" | "google_fit" | "apple_health"
  steps?: number
  heartRateAvg?: number
  sleepHours?: number
  caloriesBurned?: number
  activeMinutes?: number
  createdAt: Date
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
