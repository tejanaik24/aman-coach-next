import { NextResponse } from "next/server"
import { automationSupabase, daysBetween, getUserEmailMap, isAuthorizedAutomationRequest, todayInIndia } from "@/lib/automation"

const REMINDER_DAYS = [3, 7, 10]

export async function POST(request: Request) {
  if (!isAuthorizedAutomationRequest(request)) {
    return NextResponse.json({ error: "Unauthorized automation request" }, { status: 401 })
  }

  const today = todayInIndia()
  const { data: fees, error: feesError } = await automationSupabase
    .from("fees")
    .select("id, client_id, amount, due_date, status")
    .in("status", ["pending", "overdue"])
    .lte("due_date", today)

  if (feesError) return NextResponse.json({ error: feesError.message }, { status: 500 })
  if (!fees?.length) return NextResponse.json([])

  const [{ data: deliveries, error: deliveriesError }, { data: clients, error: clientsError }] = await Promise.all([
    automationSupabase.from("automation_deliveries").select("entity_id, event_type").eq("entity_type", "fee").in("entity_id", fees.map((fee) => fee.id)),
    automationSupabase.from("clients").select("id, user_id").in("id", fees.map((fee) => fee.client_id)),
  ])
  if (deliveriesError || clientsError) return NextResponse.json({ error: deliveriesError?.message ?? clientsError?.message }, { status: 500 })

  const userIds = (clients ?? []).map((client) => client.user_id).filter(Boolean)
  const { data: profiles, error: profilesError } = userIds.length
    ? await automationSupabase.from("profiles").select("id, name, phone").in("id", userIds)
    : { data: [], error: null }
  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 })

  const emailByUserId = await getUserEmailMap(userIds)

  const sent = new Set((deliveries ?? []).map((delivery) => `${delivery.entity_id}:${delivery.event_type}`))
  const clientById = new Map((clients ?? []).map((client) => [client.id, client]))
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

  return NextResponse.json(
    fees.flatMap((fee) => {
      const daysOverdue = daysBetween(fee.due_date, today)
      const reminderDay = REMINDER_DAYS.find((day) => day <= daysOverdue && !sent.has(`${fee.id}:payment_reminder_${day}`))
      const profile = profileById.get(clientById.get(fee.client_id)?.user_id ?? "")
      const email = emailByUserId.get(clientById.get(fee.client_id)?.user_id ?? "")
      if (!reminderDay || !profile?.phone || !email) return []
      return [{
        id: fee.id,
        client_id: fee.client_id,
        display_name: profile.name || "Client",
        phone: profile.phone.replace(/\D/g, ""),
        email,
        amount: Number(fee.amount),
        dueDate: fee.due_date,
        days_overdue: reminderDay,
      }]
    })
  )
}
