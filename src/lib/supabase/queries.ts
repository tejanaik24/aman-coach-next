import { createClient } from "@/lib/supabase/server"
import type {
  Client,
  ClientWithProfile,
  Checkin,
  Fee,
  WorkoutPlan,
  NutritionPlan,
  CoachStats,
  Profile,
} from "@/types"

// All Supabase results are cast explicitly because the client is not typed with the Database generic.

export async function getCoachStats(coachId: string): Promise<CoachStats> {
  const supabase = await createClient()

  const { data: rawClients } = await supabase
    .from("clients")
    .select("id, status")
    .eq("coach_id", coachId)

  const clientData = (rawClients ?? []) as Pick<Client, "id" | "status">[]
  const clientIds = clientData.map((c) => c.id)
  const activeClients = clientData.filter((c) => c.status === "active").length
  const totalClients = clientData.length

  if (clientIds.length === 0) {
    return { totalClients: 0, activeClients: 0, pendingCheckins: 0, feesDue: 0, monthlyRevenue: 0 }
  }

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const firstOfMonth = new Date()
  firstOfMonth.setDate(1)
  firstOfMonth.setHours(0, 0, 0, 0)

  const [r1, r2, r3] = await Promise.allSettled([
    supabase
      .from("checkins")
      .select("*", { count: "exact", head: true })
      .in("client_id", clientIds)
      .is("reviewed_at", null)
      .gte("submitted_at", weekAgo.toISOString()),
    supabase
      .from("fees")
      .select("*", { count: "exact", head: true })
      .in("client_id", clientIds)
      .in("status", ["pending", "overdue"]),
    supabase
      .from("fees")
      .select("amount")
      .in("client_id", clientIds)
      .eq("status", "paid")
      .gte("paid_date", firstOfMonth.toISOString().split("T")[0]),
  ])

  const pendingCheckins = r1.status === "fulfilled" ? (r1.value.count ?? 0) : 0
  const feesDue = r2.status === "fulfilled" ? (r2.value.count ?? 0) : 0
  const paidFees = (r3.status === "fulfilled" ? (r3.value.data ?? []) : []) as { amount: number }[]
  const monthlyRevenue = paidFees.reduce((s, f) => s + Number(f.amount), 0)

  return { totalClients, activeClients, pendingCheckins, feesDue, monthlyRevenue }
}

export async function getAllClients(coachId: string): Promise<ClientWithProfile[]> {
  const supabase = await createClient()

  const { data: rawClients } = await supabase
    .from("clients")
    .select("*")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false })

  const clients = (rawClients ?? []) as Client[]
  if (!clients.length) return []

  const userIds = clients.map((c) => c.user_id).filter(Boolean) as string[]
  const { data: rawProfiles } = await supabase
    .from("profiles")
    .select("id, name, phone, avatar_url, role, created_at, updated_at")
    .in("id", userIds)

  const profiles = (rawProfiles ?? []) as Profile[]
  const profileMap = new Map(profiles.map((p) => [p.id, p]))
  const order: Record<string, number> = { active: 0, paused: 1, inactive: 2 }

  return clients
    .map((c) => ({ ...c, profile: c.user_id ? (profileMap.get(c.user_id) ?? null) : null }))
    .sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3))
}

export async function getClientById(clientId: string): Promise<ClientWithProfile | null> {
  const supabase = await createClient()

  const { data: rawClient } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single()

  const client = rawClient as Client | null
  if (!client) return null
  if (!client.user_id) return { ...client, profile: null }

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("id, name, phone, avatar_url, role, created_at, updated_at")
    .eq("id", client.user_id)
    .single()

  const profile = rawProfile as Profile | null
  return { ...client, profile }
}

export async function getClientPlans(
  clientId: string
): Promise<{ workout: WorkoutPlan[]; nutrition: NutritionPlan[] }> {
  const supabase = await createClient()

  const [wResult, nResult] = await Promise.allSettled([
    supabase.from("workout_plans").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
    supabase.from("nutrition_plans").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
  ])

  return {
    workout: ((wResult.status === "fulfilled" ? wResult.value.data : []) ?? []) as WorkoutPlan[],
    nutrition: ((nResult.status === "fulfilled" ? nResult.value.data : []) ?? []) as NutritionPlan[],
  }
}

export async function getClientCheckins(clientId: string): Promise<Checkin[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("checkins")
    .select("*")
    .eq("client_id", clientId)
    .order("submitted_at", { ascending: false })
  return (data ?? []) as Checkin[]
}

export async function getClientFees(clientId: string): Promise<Fee[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("fees")
    .select("*")
    .eq("client_id", clientId)
    .order("due_date", { ascending: false })
  return (data ?? []) as Fee[]
}

export async function markFeeAsPaid(feeId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from("fees")
    .update({ status: "paid", paid_date: new Date().toISOString().split("T")[0] })
    .eq("id", feeId)
}

export async function addCoachFeedback(checkinId: string, feedback: string): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  await supabase
    .from("checkins")
    .update({
      coach_feedback: feedback,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id,
    })
    .eq("id", checkinId)
}

export type RecentCheckinRow = Checkin & { clientName: string }

export async function getRecentCheckins(
  coachId: string,
  limit = 5
): Promise<RecentCheckinRow[]> {
  const supabase = await createClient()

  const { data: rawClients } = await supabase
    .from("clients")
    .select("id, user_id")
    .eq("coach_id", coachId)

  const clients = (rawClients ?? []) as Pick<Client, "id" | "user_id">[]
  if (!clients.length) return []

  const clientIds = clients.map((c) => c.id)
  const userIds = clients.map((c) => c.user_id).filter(Boolean) as string[]

  const [checkinsResult, profilesResult] = await Promise.allSettled([
    supabase
      .from("checkins")
      .select("*")
      .in("client_id", clientIds)
      .order("submitted_at", { ascending: false })
      .limit(limit),
    supabase.from("profiles").select("id, name").in("id", userIds),
  ])

  const checkins = ((checkinsResult.status === "fulfilled" ? checkinsResult.value.data : []) ?? []) as Checkin[]
  const rawProfiles = ((profilesResult.status === "fulfilled" ? profilesResult.value.data : []) ?? []) as Pick<Profile, "id" | "name">[]

  const profileMap = new Map(rawProfiles.map((p) => [p.id, p.name]))
  const clientToUser = new Map(clients.map((c) => [c.id, c.user_id]))

  return checkins.map((c) => ({
    ...c,
    clientName: profileMap.get(clientToUser.get(c.client_id) ?? "") ?? "Unknown",
  }))
}

export type AttentionClientRow = ClientWithProfile & { issue: string }

export async function getClientsNeedingAttention(
  coachId: string
): Promise<AttentionClientRow[]> {
  const supabase = await createClient()

  const { data: rawClients } = await supabase
    .from("clients")
    .select("*")
    .eq("coach_id", coachId)
    .eq("status", "active")

  const clients = (rawClients ?? []) as Client[]
  if (!clients.length) return []

  const clientIds = clients.map((c) => c.id)
  const userIds = clients.map((c) => c.user_id).filter(Boolean) as string[]

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const [profilesResult, overdueResult, recentCheckinsResult] = await Promise.allSettled([
    supabase
      .from("profiles")
      .select("id, name, phone, avatar_url, role, created_at, updated_at")
      .in("id", userIds),
    supabase
      .from("fees")
      .select("client_id")
      .in("client_id", clientIds)
      .eq("status", "overdue"),
    supabase
      .from("checkins")
      .select("client_id")
      .in("client_id", clientIds)
      .gte("submitted_at", weekAgo.toISOString()),
  ])

  const profiles = ((profilesResult.status === "fulfilled" ? profilesResult.value.data : []) ?? []) as Profile[]
  const overdueData = ((overdueResult.status === "fulfilled" ? overdueResult.value.data : []) ?? []) as { client_id: string }[]
  const recentData = ((recentCheckinsResult.status === "fulfilled" ? recentCheckinsResult.value.data : []) ?? []) as { client_id: string }[]

  const overdueClientIds = new Set(overdueData.map((f) => f.client_id))
  const recentCheckinClientIds = new Set(recentData.map((c) => c.client_id))
  const profileMap = new Map(profiles.map((p) => [p.id, p]))
  const results: AttentionClientRow[] = []

  for (const client of clients) {
    const hasOverdue = overdueClientIds.has(client.id)
    const hasRecentCheckin = recentCheckinClientIds.has(client.id)
    if (!hasOverdue && hasRecentCheckin) continue

    const issues: string[] = []
    if (hasOverdue) issues.push("Fee overdue")
    if (!hasRecentCheckin) issues.push("No check-in")

    results.push({
      ...client,
      profile: client.user_id ? (profileMap.get(client.user_id) ?? null) : null,
      issue: issues.join(" · "),
    })
  }

  return results.slice(0, 5)
}
