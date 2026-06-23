import { getSupabaseClient } from "./supabase"
import type { Client, ClientWithProfile, Profile, Checkin, Fee, WorkoutPlan, NutritionPlan } from "@/types"

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
