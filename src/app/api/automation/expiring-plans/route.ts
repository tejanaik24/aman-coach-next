import { NextResponse } from "next/server"
import { automationSupabase, daysBetween, getUserEmailMap, isAuthorizedAutomationRequest, todayInIndia } from "@/lib/automation"

function reminderForDaysLeft(daysLeft: number): number | null {
  if (daysLeft <= 0) return 0
  if (daysLeft <= 3) return 3
  if (daysLeft <= 7) return 7
  return null
}

export async function POST(request: Request) {
  if (!isAuthorizedAutomationRequest(request)) {
    return NextResponse.json({ error: "Unauthorized automation request" }, { status: 401 })
  }

  const today = todayInIndia()
  const { data: clients, error: clientsError } = await automationSupabase
    .from("clients")
    .select("id, user_id, end_date")
    .eq("status", "active")
    .not("end_date", "is", null)
    .lte("end_date", new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10))

  if (clientsError) return NextResponse.json({ error: clientsError.message }, { status: 500 })
  if (!clients?.length) return NextResponse.json([])

  const [{ data: deliveries, error: deliveriesError }, { data: profiles, error: profilesError }] = await Promise.all([
    automationSupabase.from("automation_deliveries").select("entity_id, event_type").eq("entity_type", "plan").in("entity_id", clients.map((client) => client.id)),
    automationSupabase.from("profiles").select("id, name, phone").in("id", clients.map((client) => client.user_id).filter(Boolean)),
  ])
  if (deliveriesError || profilesError) return NextResponse.json({ error: deliveriesError?.message ?? profilesError?.message }, { status: 500 })

  const emailByUserId = await getUserEmailMap(clients.map((client) => client.user_id))
  const sent = new Set((deliveries ?? []).map((delivery) => `${delivery.entity_id}:${delivery.event_type}`))
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  return NextResponse.json(
    clients.flatMap((client) => {
      const daysLeft = daysBetween(today, client.end_date!)
      const reminderDay = reminderForDaysLeft(daysLeft)
      const profile = profileById.get(client.user_id ?? "")
      const email = emailByUserId.get(client.user_id ?? "")
      if (reminderDay === null || sent.has(`${client.id}:plan_expiry_${reminderDay}`) || !profile?.phone || !email) return []
      return [{
        id: client.id,
        client_id: client.id,
        display_name: profile.name || "Client",
        phone: profile.phone.replace(/\D/g, ""),
        email,
        expiry_date: client.end_date,
        days_left: reminderDay,
      }]
    })
  )
}
