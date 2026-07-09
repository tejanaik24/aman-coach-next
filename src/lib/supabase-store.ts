import { getSupabaseClient } from "./supabase"
import type { Client, ClientWithProfile, Profile, Checkin, Fee, WorkoutPlan, NutritionPlan, CoachAvailabilitySlot, Appointment } from "@/types"

function sb() {
  const c = getSupabaseClient()
  if (!c) throw new Error("Supabase not configured")
  return c
}

export async function getClientProfile(uid: string): Promise<Client | null> {
  const { data, error } = await sb().from("clients").select("*").eq("user_id", uid).single()
  if (error || !data) return null
  return data as Client
}

export async function getCoachClients(coachId: string): Promise<ClientWithProfile[]> {
  const { data, error } = await sb()
    .from("clients")
    .select("*, profile:profiles(*)")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false })
  if (error || !data) return []
  return (data as (Client & { profile: Profile | null })[]).map((r) => ({
    ...r,
    profile: r.profile ?? null,
  }))
}

export async function getCheckins(clientId: string): Promise<Checkin[]> {
  const { data, error } = await sb()
    .from("checkins")
    .select("*")
    .eq("client_id", clientId)
    .order("submitted_at", { ascending: false })
    .limit(20)
  if (error || !data) return []
  return data as Checkin[]
}

export async function getCoachCheckins(coachId: string): Promise<Checkin[]> {
  const { data, error } = await sb()
    .from("checkins")
    .select("*, clients!inner(coach_id)")
    .eq("clients.coach_id", coachId)
    .order("submitted_at", { ascending: false })
    .limit(50)
  if (error || !data) return []
  return data as Checkin[]
}

export async function getWorkoutPlan(clientId: string): Promise<WorkoutPlan | null> {
  const { data, error } = await sb()
    .from("workout_plans")
    .select("*")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .single()
  if (error || !data) return null
  return data as WorkoutPlan
}

export async function getNutritionPlan(clientId: string): Promise<NutritionPlan | null> {
  const { data, error } = await sb()
    .from("nutrition_plans")
    .select("*")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .single()
  if (error || !data) return null
  return data as NutritionPlan
}

export async function getFees(clientId: string): Promise<Fee[]> {
  const { data, error } = await sb()
    .from("fees")
    .select("*")
    .eq("client_id", clientId)
    .order("due_date", { ascending: false })
  if (error || !data) return []
  return data as Fee[]
}

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


