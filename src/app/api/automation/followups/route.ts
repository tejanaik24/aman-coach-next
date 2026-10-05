import { NextResponse } from "next/server"
import { automationSupabase as db, isAuthorizedAutomationRequest, todayInIndia, daysBetween } from "@/lib/automation"
import { sendCheckinReminder } from "@/lib/whatsapp"

// Daily job (Vercel cron, ~9am IST):
//  1. keeps one open "check-in" follow-up per active client (next one = last check-in + 7 days)
//  2. closes a follow-up once the client has checked in
//  3. WhatsApps the check-in link 2 days before a check-in follow-up is due (Aman's request)
const CHECKIN_EVERY_DAYS = 7
const REMIND_DAYS_BEFORE = 2
const REMIND_COOLDOWN_DAYS = 5

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

async function run(request: Request) {
  if (!isAuthorizedAutomationRequest(request)) {
    return NextResponse.json({ error: "Unauthorized automation request" }, { status: 401 })
  }

  const today = todayInIndia()
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString()

  const [clientsRes, openRes, checkinsRes] = await Promise.all([
    db.from("clients").select("id, coach_id, start_date, user_id").eq("status", "active"),
    db.from("followups").select("id, client_id, due_date, created_at").eq("type", "checkin").is("done_at", null),
    db.from("checkins").select("client_id, submitted_at").gte("submitted_at", since),
  ])
  const err = clientsRes.error ?? openRes.error ?? checkinsRes.error
  if (err) return NextResponse.json({ error: err.message }, { status: 500 })

  const lastCheckin = new Map<string, string>()
  for (const c of checkinsRes.data ?? []) {
    const prev = lastCheckin.get(c.client_id)
    if (!prev || c.submitted_at > prev) lastCheckin.set(c.client_id, c.submitted_at)
  }
  const openByClient = new Map<string, { id: string; due_date: string; created_at: string }>()
  for (const f of openRes.data ?? []) {
    const prev = openByClient.get(f.client_id)
    if (!prev || f.due_date < prev.due_date) openByClient.set(f.client_id, f)
  }

  let created = 0
  let closed = 0
  for (const client of clientsRes.data ?? []) {
    if (!client.coach_id) continue
    const last = lastCheckin.get(client.id)
    let open = openByClient.get(client.id)

    if (open && last && last > open.created_at) {
      const { error } = await db
        .from("followups")
        .update({ result: "successful", done_at: new Date().toISOString() })
        .eq("id", open.id)
      if (!error) { closed++; open = undefined; openByClient.delete(client.id) }
    }

    if (!open) {
      const base = last ? last.slice(0, 10) : client.start_date
      if (!base) continue
      const due = addDays(base, CHECKIN_EVERY_DAYS)
      const { data, error } = await db
        .from("followups")
        .insert({
          client_id: client.id,
          coach_id: client.coach_id,
          type: "checkin",
          due_date: due < today ? today : due,
          auto_created: true,
        })
        .select("id, due_date, created_at")
        .single()
      if (!error && data) { created++; openByClient.set(client.id, data) }
    }
  }

  // Reminders: check-in follow-ups due exactly REMIND_DAYS_BEFORE days from today.
  const dueSoon = [...openByClient.entries()].filter(([, f]) => daysBetween(today, f.due_date) === REMIND_DAYS_BEFORE)
  const clientById = new Map((clientsRes.data ?? []).map((c) => [c.id, c]))
  const cooldown = new Date(Date.now() - REMIND_COOLDOWN_DAYS * 86_400_000).toISOString()
  const ids = dueSoon.map(([id]) => id)
  const [loggedRes, profilesRes] = ids.length
    ? await Promise.all([
        db.from("reminder_log").select("client_id").eq("reminder_type", "checkin_followup").gte("sent_at", cooldown).in("client_id", ids),
        db.from("profiles").select("id, name, phone").in("id", dueSoon.map(([id]) => clientById.get(id)?.user_id).filter(Boolean) as string[]),
      ])
    : [{ data: [] }, { data: [] }]
  const alreadySent = new Set((loggedRes.data ?? []).map((r: { client_id: string }) => r.client_id))
  const profileById = new Map((profilesRes.data ?? []).map((p: { id: string; name: string; phone: string | null }) => [p.id, p]))

  const reminders: { clientId: string; status: string }[] = []
  for (const [clientId] of dueSoon) {
    if (alreadySent.has(clientId)) { reminders.push({ clientId, status: "already_sent" }); continue }
    const profile = profileById.get(clientById.get(clientId)?.user_id ?? "")
    const phone = profile?.phone?.replace(/\D/g, "")
    if (!phone) { reminders.push({ clientId, status: "no_phone" }); continue }
    const res = await sendCheckinReminder(phone, profile?.name ?? "there")
    if (res.success) await db.from("reminder_log").insert({ client_id: clientId, reminder_type: "checkin_followup" })
    reminders.push({ clientId, status: res.success ? "sent" : "failed" })
  }

  return NextResponse.json({ today, created, closed, reminders })
}

// Vercel cron calls GET; manual/n8n calls can use POST.
export const GET = run
export const POST = run
