import { NextResponse } from "next/server"
import { automationSupabase, isAuthorizedAutomationRequest } from "@/lib/automation"

export async function POST(request: Request) {
  if (!isAuthorizedAutomationRequest(request)) {
    return NextResponse.json({ error: "Unauthorized automation request" }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  const [{ data: clients, error: clientsError }, { data: sent, error: sentError }] = await Promise.all([
    automationSupabase.from("clients").select("id, user_id").eq("status", "active").not("user_id", "is", null),
    automationSupabase.from("reminder_log").select("client_id").eq("reminder_type", "checkin").gte("sent_at", cutoff),
  ])

  if (clientsError || sentError) {
    return NextResponse.json({ error: clientsError?.message ?? sentError?.message }, { status: 500 })
  }

  const recentlyReminded = new Set((sent ?? []).map((row) => row.client_id))
  const userIds = (clients ?? []).map((client) => client.user_id).filter(Boolean)
  if (!userIds.length) return NextResponse.json([])

  const { data: profiles, error: profilesError } = await automationSupabase
    .from("profiles")
    .select("id, name, phone")
    .in("id", userIds)

  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 })
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

  return NextResponse.json(
    (clients ?? [])
      .filter((client) => !recentlyReminded.has(client.id))
      .map((client) => ({
        id: client.id,
        display_name: profileById.get(client.user_id!)?.name ?? "Client",
        phone: profileById.get(client.user_id!)?.phone?.replace(/\D/g, "") ?? "",
      }))
      .filter((client) => client.phone)
  )
}
