import type {
  Client, Checkin, Payment, Lead, Message, WorkoutPlan, DietPlan, Meal, Notification,
  MealLog, FoodDatabaseItem, Habit, HabitLog, WearableMetric, CoachAvailabilitySlot, Appointment,
} from "@/types"
import { getSupabaseClient } from "./supabase"

function sb() {
  const c = getSupabaseClient()
  if (!c) throw new Error("Supabase not configured")
  return c
}

// ── Users / Clients ───────────────────────────────────────────────────

export async function getClientProfile(uid: string): Promise<Client | null> {
  const { data, error } = await sb().from("users").select("*").eq("id", uid).single()
  if (error || !data) return null
  return mapUser(data)
}

export async function getCoachClients(coachId: string): Promise<Client[]> {
  const { data, error } = await sb()
    .from("users")
    .select("*")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false })
  if (error || !data) return []
  return data.map(mapUser)
}

function mapUser(row: Record<string, unknown>): Client {
  return {
    uid: row.id as string,
    email: row.email as string,
    displayName: row.display_name as string,
    photoURL: row.photo_url as string | undefined,
    phone: row.phone as string | undefined,
    role: "client",
    coachId: row.coach_id as string,
    goal: row.goal as string | undefined,
    height: row.height as number | undefined,
    weight: row.weight as number | undefined,
    age: row.age as number | undefined,
    gender: row.gender as "male" | "female" | "other" | undefined,
    medicalConditions: row.medical_conditions as string | undefined,
    startDate: row.start_date ? new Date(row.start_date as string) : row.created_at ? new Date(row.created_at as string) : new Date(),
    endDate: row.end_date ? new Date(row.end_date as string) : undefined,
    plan: row.plan as "basic" | "premium" | "elite" | undefined,
    status: (row.status as "active" | "paused" | "inactive") || "active",
    lastCheckin: row.last_checkin ? new Date(row.last_checkin as string) : undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

// ── Checkins ──────────────────────────────────────────────────────────

export async function getCheckins(clientId: string, max = 20): Promise<Checkin[]> {
  const { data, error } = await sb()
    .from("checkins")
    .select("*")
    .eq("client_id", clientId)
    .order("date", { ascending: false })
    .limit(max)
  if (error || !data) return []
  return data.map(mapCheckin)
}

export async function getCoachCheckins(coachId: string, max = 50): Promise<Checkin[]> {
  const { data, error } = await sb()
    .from("checkins")
    .select("*")
    .eq("coach_id", coachId)
    .order("date", { ascending: false })
    .limit(max)
  if (error || !data) return []
  return data.map(mapCheckin)
}

export async function addCheckin(data: Partial<Checkin>): Promise<string> {
  const { data: inserted, error } = await sb()
    .from("checkins")
    .insert({
      client_id: data.clientId,
      coach_id: data.coachId,
      date: data.date?.toISOString() || new Date().toISOString(),
      weight: data.weight,
      energy: data.energy,
      sleep: data.sleep,
      hunger: data.hunger,
      mood: data.mood,
      adherence: data.adherence,
      notes: data.notes,
      photos: data.photos || [],
    })
    .select("id")
    .single()
  if (error) throw error
  return inserted.id
}

function mapCheckin(row: Record<string, unknown>): Checkin {
  return {
    id: row.id as string,
    clientId: row.client_id as string,
    coachId: row.coach_id as string,
    date: new Date(row.date as string),
    weight: row.weight as number | undefined,
    measurements: {
      chest: row.chest as number | undefined,
      waist: row.waist as number | undefined,
      hips: row.hips as number | undefined,
      arms: row.arms as number | undefined,
      thighs: row.thighs as number | undefined,
    },
    photos: row.photos ? JSON.parse(row.photos as string) : undefined,
    energy: row.energy as number | undefined,
    sleep: row.sleep as number | undefined,
    hunger: row.hunger as number | undefined,
    mood: row.mood as number | undefined,
    adherence: row.adherence as number | undefined,
    notes: row.notes as string | undefined,
    coachNotes: row.coach_notes as string | undefined,
    createdAt: new Date(row.created_at as string),
  }
}

// ── Payments ──────────────────────────────────────────────────────────

export async function getPayments(clientId: string, max = 20): Promise<Payment[]> {
  const { data, error } = await sb()
    .from("payments")
    .select("*")
    .eq("client_id", clientId)
    .order("date", { ascending: false })
    .limit(max)
  if (error || !data) return []
  return data.map(mapPayment)
}

export async function getCoachPayments(coachId: string, max = 50): Promise<Payment[]> {
  const { data, error } = await sb()
    .from("payments")
    .select("*")
    .eq("coach_id", coachId)
    .order("date", { ascending: false })
    .limit(max)
  if (error || !data) return []
  return data.map(mapPayment)
}

export async function updatePaymentStatus(id: string, status: Payment["status"]): Promise<void> {
  const { error } = await sb()
    .from("payments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw error
}

export async function addPayment(data: Partial<Payment>): Promise<string> {
  const { data: inserted, error } = await sb()
    .from("payments")
    .insert({
      client_id: data.clientId,
      coach_id: data.coachId,
      amount: data.amount,
      currency: data.currency || "INR",
      method: data.method || "upi",
      status: data.status || "pending",
      plan: data.plan,
      month: data.month,
      notes: data.notes,
      date: data.date?.toISOString() || new Date().toISOString(),
    })
    .select("id")
    .single()
  if (error) throw error
  return inserted.id
}

function mapPayment(row: Record<string, unknown>): Payment {
  return {
    id: row.id as string,
    clientId: row.client_id as string,
    coachId: row.coach_id as string,
    amount: row.amount as number,
    currency: row.currency as string,
    method: row.method as "upi" | "cash" | "bank" | "other",
    upiTransactionId: row.upi_transaction_id as string | undefined,
    status: row.status as "pending" | "completed" | "failed" | "refunded",
    plan: row.plan as string | undefined,
    month: row.month as string | undefined,
    invoiceId: row.invoice_id as string | undefined,
    notes: row.notes as string | undefined,
    date: new Date(row.date as string),
    createdAt: new Date(row.created_at as string),
  }
}

// ── Leads ─────────────────────────────────────────────────────────────

export async function getLeads(status?: string): Promise<Lead[]> {
  let query = sb().from("leads").select("*").order("created_at", { ascending: false })
  if (status) query = query.eq("status", status)
  const { data, error } = await query
  if (error || !data) return []
  return data.map(mapLead)
}

export async function addLead(data: Partial<Lead>): Promise<string> {
  const { data: inserted, error } = await sb()
    .from("leads")
    .insert({
      name: data.name,
      email: data.email,
      phone: data.phone,
      goal: data.goal,
      source: data.source,
      notes: data.notes,
    })
    .select("id")
    .single()
  if (error) throw error
  return inserted.id
}

export async function updateLeadStatus(id: string, status: string): Promise<void> {
  const { error } = await sb()
    .from("leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw error
}

function mapLead(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    phone: row.phone as string,
    goal: row.goal as string | undefined,
    source: row.source as string | undefined,
    status: row.status as "new" | "contacted" | "qualified" | "converted" | "lost",
    notes: row.notes as string | undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

// ── Messages ──────────────────────────────────────────────────────────

export async function sendMessage(data: Partial<Message>): Promise<string> {
  const { data: inserted, error } = await sb()
    .from("messages")
    .insert({
      sender_id: data.senderId,
      receiver_id: data.receiverId,
      text: data.text,
    })
    .select("id")
    .single()
  if (error) throw error
  return inserted.id
}

export async function getMessages(uid: string, _otherUid: string, max = 50): Promise<Message[]> {
  const { data, error } = await sb()
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
    .order("created_at", { ascending: false })
    .limit(max)
  if (error || !data) return []
  return data.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    senderId: r.sender_id as string,
    receiverId: r.receiver_id as string,
    text: r.text as string,
    read: !!r.read,
    createdAt: new Date(r.created_at as string),
  }))
}

export async function getUserMessages(userId: string, max = 100): Promise<Message[]> {
  const { data, error } = await sb()
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(max)
  if (error || !data) return []
  return data.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    senderId: r.sender_id as string,
    receiverId: r.receiver_id as string,
    text: r.text as string,
    read: !!r.read,
    createdAt: new Date(r.created_at as string),
  }))
}

export async function markMessageRead(messageId: string): Promise<void> {
  const { error } = await sb().from("messages").update({ read: true }).eq("id", messageId)
  if (error) throw error
}

export async function updateCheckin(id: string, data: Partial<Checkin>): Promise<void> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.notes !== undefined) payload.notes = data.notes
  if (data.coachNotes !== undefined) payload.coach_notes = data.coachNotes
  if (data.energy !== undefined) payload.energy = data.energy
  if (data.sleep !== undefined) payload.sleep = data.sleep
  if (data.mood !== undefined) payload.mood = data.mood
  if (data.adherence !== undefined) payload.adherence = data.adherence
  if (data.weight !== undefined) payload.weight = data.weight
  const { error } = await sb().from("checkins").update(payload).eq("id", id)
  if (error) throw error
}

// ── Workouts ──────────────────────────────────────────────────────────

export async function getWorkoutPlan(clientId: string): Promise<WorkoutPlan | null> {
  const { data, error } = await sb()
    .from("workout_plans")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
  if (error || !data || data.length === 0) return null
  return mapWorkoutPlan(data[0])
}

export async function saveWorkoutPlan(data: Partial<WorkoutPlan>): Promise<string> {
  const { data: inserted, error } = await sb()
    .from("workout_plans")
    .insert({
      client_id: data.clientId,
      coach_id: data.coachId,
      name: data.name,
      description: data.description,
      days: JSON.stringify(data.days || []),
      start_date: data.startDate?.toISOString(),
      end_date: data.endDate?.toISOString(),
    })
    .select("id")
    .single()
  if (error) throw error
  return inserted.id
}

function mapWorkoutPlan(row: Record<string, unknown>): WorkoutPlan {
  return {
    id: row.id as string,
    clientId: row.client_id as string,
    coachId: row.coach_id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    days: typeof row.days === "string" ? JSON.parse(row.days) : row.days || [],
    startDate: row.start_date ? new Date(row.start_date as string) : undefined,
    endDate: row.end_date ? new Date(row.end_date as string) : undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

// ── Diet Plans ────────────────────────────────────────────────────────

export async function getDietPlan(clientId: string): Promise<DietPlan | null> {
  const { data, error } = await sb()
    .from("diet_plans")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
  if (error || !data || data.length === 0) return null
  return mapDietPlan(data[0])
}

export async function saveDietPlan(data: Partial<DietPlan>): Promise<string> {
  const { data: inserted, error } = await sb()
    .from("diet_plans")
    .insert({
      client_id: data.clientId,
      coach_id: data.coachId,
      name: data.name,
      description: data.description,
      calories: data.calories,
      meals: JSON.stringify(data.meals || []),
      start_date: data.startDate?.toISOString(),
      end_date: data.endDate?.toISOString(),
    })
    .select("id")
    .single()
  if (error) throw error
  return inserted.id
}

function mapDietPlan(row: Record<string, unknown>): DietPlan {
  return {
    id: row.id as string,
    clientId: row.client_id as string,
    coachId: row.coach_id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    calories: row.calories as number | undefined,
    meals: typeof row.meals === "string" ? JSON.parse(row.meals as string) : (row.meals as Meal[]) || [],
    startDate: row.start_date ? new Date(row.start_date as string) : undefined,
    endDate: row.end_date ? new Date(row.end_date as string) : undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

// ── Notifications ─────────────────────────────────────────────────────

export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await sb()
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20)
  if (error || !data) return []
  return data.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    userId: r.user_id as string,
    title: r.title as string,
    body: r.body as string,
    type: r.type as Notification["type"],
    read: !!r.read,
    link: r.link as string | undefined,
    createdAt: new Date(r.created_at as string),
  }))
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await sb().from("notifications").update({ read: true }).eq("id", id)
  if (error) throw error
}

// ── F1: Meal Logging ────────────────────────────────────────────────────

export async function getMealLogs(userId: string, date?: string): Promise<MealLog[]> {
  let q = sb().from("meal_logs").select("*").eq("user_id", userId)
  if (date) q = q.eq("date", date)
  q = q.order("created_at", { ascending: true })
  const { data, error } = await q
  if (error || !data) return []
  return data.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    userId: r.user_id as string,
    date: r.date as string,
    mealName: r.meal_name as MealLog["mealName"],
    foods: typeof r.foods === "string" ? JSON.parse(r.foods as string) : (r.foods as MealLog["foods"]),
    totalCalories: Number(r.total_calories),
    totalProtein: Number(r.total_protein),
    totalCarbs: Number(r.total_carbs),
    totalFats: Number(r.total_fats),
    createdAt: new Date(r.created_at as string),
  }))
}

export async function logMeal(data: Partial<MealLog>): Promise<string> {
  const { data: inserted, error } = await sb()
    .from("meal_logs")
    .insert({
      user_id: data.userId,
      date: data.date,
      meal_name: data.mealName,
      foods: JSON.stringify(data.foods || []),
      total_calories: data.totalCalories || 0,
      total_protein: data.totalProtein || 0,
      total_carbs: data.totalCarbs || 0,
      total_fats: data.totalFats || 0,
    })
    .select("id")
    .single()
  if (error) throw error
  return inserted.id
}

export async function deleteMealLog(id: string): Promise<void> {
  const { error } = await sb().from("meal_logs").delete().eq("id", id)
  if (error) throw error
}

export async function searchFoodDatabase(query: string): Promise<FoodDatabaseItem[]> {
  const { data, error } = await sb()
    .from("food_database")
    .select("*")
    .ilike("name", `%${query}%`)
    .order("is_common", { ascending: false })
    .limit(20)
  if (error || !data) return []
  return data.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    name: r.name as string,
    portion: r.portion as string,
    calories: Number(r.calories),
    protein: Number(r.protein),
    carbs: Number(r.carbs),
    fats: Number(r.fats),
    category: r.category as string,
    isCommon: !!r.is_common,
  }))
}

export async function getAllFoodCategories(): Promise<string[]> {
  const { data, error } = await sb()
    .from("food_database")
    .select("category", { count: "exact", head: false })
    .order("category")
  if (error || !data) return []
  return Array.from(new Set(data.map((r: Record<string, unknown>) => r.category as string)))
}

// ── F2: Habit Tracking ───────────────────────────────────────────────────

export async function getHabits(userId: string): Promise<Habit[]> {
  const { data, error } = await sb()
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
  if (error || !data) return []
  return data.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    userId: r.user_id as string,
    name: r.name as string,
    icon: r.icon as string,
    category: r.category as Habit["category"],
    color: r.color as string,
    sortOrder: r.sort_order as number,
    createdAt: new Date(r.created_at as string),
  }))
}

export async function createHabit(data: Partial<Habit>): Promise<string> {
  const { data: inserted, error } = await sb()
    .from("habits")
    .insert({
      user_id: data.userId,
      name: data.name,
      icon: data.icon || "✅",
      category: data.category || "other",
      color: data.color || "#FFB800",
      sort_order: data.sortOrder || 0,
    })
    .select("id")
    .single()
  if (error) throw error
  return inserted.id
}

export async function deleteHabit(id: string): Promise<void> {
  const { error } = await sb().from("habits").delete().eq("id", id)
  if (error) throw error
}

export async function getHabitLogs(userId: string, date: string): Promise<HabitLog[]> {
  const { data, error } = await sb()
    .from("habit_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
  if (error || !data) return []
  return data.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    habitId: r.habit_id as string,
    userId: r.user_id as string,
    date: r.date as string,
    value: Number(r.value),
    note: r.note as string | undefined,
    createdAt: new Date(r.created_at as string),
  }))
}

export async function getHabitLogsRange(userId: string, startDate: string, endDate: string): Promise<HabitLog[]> {
  const { data, error } = await sb()
    .from("habit_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true })
  if (error || !data) return []
  return data.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    habitId: r.habit_id as string,
    userId: r.user_id as string,
    date: r.date as string,
    value: Number(r.value),
    note: r.note as string | undefined,
    createdAt: new Date(r.created_at as string),
  }))
}

export async function toggleHabitLog(habitId: string, userId: string, date: string): Promise<boolean> {
  const existing = await sb()
    .from("habit_logs")
    .select("id")
    .eq("habit_id", habitId)
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle()
  if (existing.data) {
    const { error } = await sb().from("habit_logs").delete().eq("id", existing.data.id)
    if (error) throw error
    return false
  }
  const { error } = await sb().from("habit_logs").insert({ habit_id: habitId, user_id: userId, date, value: 1 })
  if (error) throw error
  return true
}

// ── F3: Wearable Metrics ─────────────────────────────────────────────────

export async function getWearableMetrics(userId: string, date: string): Promise<WearableMetric[]> {
  const { data, error } = await sb()
    .from("wearable_metrics")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
  if (error || !data) return []
  return data.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    userId: r.user_id as string,
    date: r.date as string,
    source: r.source as WearableMetric["source"],
    steps: r.steps as number | undefined,
    heartRateAvg: r.heart_rate_avg as number | undefined,
    sleepHours: r.sleep_hours as number | undefined,
    caloriesBurned: r.calories_burned as number | undefined,
    activeMinutes: r.active_minutes as number | undefined,
    createdAt: new Date(r.created_at as string),
  }))
}

export async function getWearableMetricsRange(userId: string, startDate: string, endDate: string): Promise<WearableMetric[]> {
  const { data, error } = await sb()
    .from("wearable_metrics")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true })
  if (error || !data) return []
  return data.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    userId: r.user_id as string,
    date: r.date as string,
    source: r.source as WearableMetric["source"],
    steps: r.steps as number | undefined,
    heartRateAvg: r.heart_rate_avg as number | undefined,
    sleepHours: r.sleep_hours as number | undefined,
    caloriesBurned: r.calories_burned as number | undefined,
    activeMinutes: r.active_minutes as number | undefined,
    createdAt: new Date(r.created_at as string),
  }))
}

export async function saveWearableMetrics(data: Partial<WearableMetric>): Promise<string> {
  const { data: inserted, error } = await sb()
    .from("wearable_metrics")
    .upsert({
      user_id: data.userId,
      date: data.date,
      source: data.source || "manual",
      steps: data.steps,
      heart_rate_avg: data.heartRateAvg,
      sleep_hours: data.sleepHours,
      calories_burned: data.caloriesBurned,
      active_minutes: data.activeMinutes,
    }, { onConflict: "user_id,date,source" })
    .select("id")
    .single()
  if (error) throw error
  return inserted.id
}

// ── F4: Scheduling ───────────────────────────────────────────────────────

export async function getCoachAvailability(coachId: string): Promise<CoachAvailabilitySlot[]> {
  const { data, error } = await sb()
    .from("coach_availability")
    .select("*")
    .eq("coach_id", coachId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true })
  if (error || !data) return []
  return data.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    coachId: r.coach_id as string,
    dayOfWeek: r.day_of_week as number,
    startTime: r.start_time as string,
    endTime: r.end_time as string,
    isAvailable: !!r.is_available,
    createdAt: new Date(r.created_at as string),
  }))
}

export async function setCoachAvailability(slots: { dayOfWeek: number; startTime: string; endTime: string }[], coachId: string): Promise<void> {
  await sb().from("coach_availability").delete().eq("coach_id", coachId)
  if (slots.length === 0) return
  const { error } = await sb().from("coach_availability").insert(
    slots.map((s) => ({
      coach_id: coachId,
      day_of_week: s.dayOfWeek,
      start_time: s.startTime,
      end_time: s.endTime,
    }))
  )
  if (error) throw error
}

export async function getAppointments(userId: string, role: "client" | "coach", date?: string): Promise<Appointment[]> {
  const field = role === "client" ? "client_id" : "coach_id"
  let q = sb().from("appointments").select("*").eq(field, userId)
  if (date) q = q.eq("date", date)
  q = q.order("date", { ascending: false }).order("start_time", { ascending: false })
  const { data, error } = await q
  if (error || !data) return []
  return data.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    clientId: r.client_id as string,
    coachId: r.coach_id as string,
    date: r.date as string,
    startTime: r.start_time as string,
    endTime: r.end_time as string,
    status: r.status as Appointment["status"],
    notes: r.notes as string | undefined,
    createdAt: new Date(r.created_at as string),
    updatedAt: new Date(r.updated_at as string),
  }))
}

export async function createAppointment(data: Partial<Appointment>): Promise<string> {
  const { data: inserted, error } = await sb()
    .from("appointments")
    .insert({
      client_id: data.clientId,
      coach_id: data.coachId,
      date: data.date,
      start_time: data.startTime,
      end_time: data.endTime,
      notes: data.notes,
    })
    .select("id")
    .single()
  if (error) throw error
  return inserted.id
}

export async function updateAppointmentStatus(id: string, status: string): Promise<void> {
  const { error } = await sb()
    .from("appointments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw error
}

export async function getAvailableSlots(coachId: string, date: string): Promise<{ startTime: string; endTime: string }[]> {
  const dayOfWeek = new Date(date).getDay()
  const { data: availability, error: availErr } = await sb()
    .from("coach_availability")
    .select("*")
    .eq("coach_id", coachId)
    .eq("day_of_week", dayOfWeek)
    .eq("is_available", true)
  if (availErr || !availability) return []

  const { data: booked, error: bookErr } = await sb()
    .from("appointments")
    .select("start_time,end_time")
    .eq("coach_id", coachId)
    .eq("date", date)
    .neq("status", "cancelled")
  if (bookErr || !booked) return []

  const bookedRanges = booked.map((b: Record<string, unknown>) => ({
    start: b.start_time as string,
    end: b.end_time as string,
  }))

  const slots: { startTime: string; endTime: string }[] = []
  for (const a of availability) {
    const startH = parseInt((a.start_time as string).split(":")[0])
    const endH = parseInt((a.end_time as string).split(":")[0])
    for (let h = startH; h < endH; h++) {
      const slotStart = `${h.toString().padStart(2, "0")}:00`
      const slotEnd = `${(h + 1).toString().padStart(2, "0")}:00`
      const isBooked = bookedRanges.some((b: { start: string; end: string }) => b.start === slotStart)
      if (!isBooked) slots.push({ startTime: slotStart, endTime: slotEnd })
    }
  }
  return slots
}

// --- Onboarding Forms ---

export async function saveOnboardingDraft(userId: string, data: Record<string, unknown>, formType = "standard"): Promise<void> {
  const { error } = await sb()
    .from("onboarding_forms")
    .upsert(
      { user_id: userId, form_type: formType, data, status: "pending" },
      { onConflict: "user_id" }
    )
  if (error) throw error
}

export async function submitOnboardingForm(userId: string, data: Record<string, unknown>, formType = "standard"): Promise<void> {
  const { error } = await sb()
    .from("onboarding_forms")
    .upsert(
      { user_id: userId, form_type: formType, data, status: "submitted", submitted_at: new Date().toISOString() },
      { onConflict: "user_id" }
    )
  if (error) throw error
}

export async function getOnboardingForm(userId: string): Promise<{ data: Record<string, unknown>; status: string; form_type: string } | null> {
  const { data, error } = await sb()
    .from("onboarding_forms")
    .select("data, status, form_type")
    .eq("user_id", userId)
    .maybeSingle()
  if (error || !data) return null
  return data as { data: Record<string, unknown>; status: string; form_type: string }
}

export async function getCoachOnboardingForms(coachId: string): Promise<Array<{ user_id: string; data: Record<string, unknown>; status: string; form_type: string; submitted_at: string }>> {
  const { data, error } = await sb()
    .from("onboarding_forms")
    .select("user_id, data, status, form_type, submitted_at")
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false })
  if (error || !data) return []
  return data as Array<{ user_id: string; data: Record<string, unknown>; status: string; form_type: string; submitted_at: string }>
}
