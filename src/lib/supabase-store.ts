import type {
  Client, Checkin, Payment, Lead, Message, WorkoutPlan, DietPlan, Meal, Notification,
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
    startDate: new Date(row.start_date as string || row.created_at as string),
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

export async function getMessages(uid: string, otherUid: string, max = 50): Promise<Message[]> {
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
