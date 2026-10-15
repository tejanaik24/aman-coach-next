import { NextResponse } from "next/server"
import {
  automationSupabase as db,
  isAuthorizedAutomationRequest,
  todayInIndia,
  daysBetween,
} from "@/lib/automation"
import { amountDue } from "@/lib/fee-math"
import { sendFeeReminder, type FeeReminderStage } from "@/lib/whatsapp"

// Daily job (Vercel cron): fee reminders before, on and after the due date.
//  Aman's rule (WhatsApp 2026-10-14 23:44): before = 3 days before ("will be due"), due = due day ("is due"),
//  late = 1 week after ("has been overdue").
// Only the latest stage that applies is sent, once per bill (tracked in reminder_log), so a bill
// that is already 10 days late gets one overdue message, not three.
// Sending stays OFF until FEE_REMINDERS_ENABLED=true; otherwise this only lists who would be messaged.
const ORDER: FeeReminderStage[] = ["before", "due", "late"]

function stageFor(diff: number): FeeReminderStage | null {
  // diff = days from today to the due date (negative when late)
  if (diff <= -7) return "late"
  if (diff < 0) return null // 1-6 days late: nothing new yet
  if (diff === 0) return "due"
  if (diff <= 3) return "before"
  return null
}

function prettyDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}

async function run(request: Request) {
  if (!isAuthorizedAutomationRequest(request)) {
    return NextResponse.json({ error: "Unauthorized automation request" }, { status: 401 })
  }

  const url = new URL(request.url)
  const live = process.env.FEE_REMINDERS_ENABLED === "true" && url.searchParams.get("dryRun") !== "1"
  const rawDate = url.searchParams.get("date")
  const today = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : todayInIndia()

  const { data: fees, error } = await db
    .from("fees")
    .select("id, client_id, amount, amount_paid, due_date, status")
    .in("status", ["pending", "overdue"])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const open = (fees ?? []).filter((f) => amountDue(f) > 0)
  if (!open.length) return NextResponse.json({ today, live, results: [] })

  const clientIds = [...new Set(open.map((f) => f.client_id))]
  const [{ data: clients }, { data: logs }] = await Promise.all([
    db.from("clients").select("id, user_id, package_name, status").in("id", clientIds),
    db.from("reminder_log").select("reminder_type").like("reminder_type", "fee_%").in("client_id", clientIds),
  ])
  const userIds = (clients ?? []).map((c) => c.user_id).filter(Boolean)
  const { data: profiles } = userIds.length
    ? await db.from("profiles").select("id, name, phone, notifications_enabled").in("id", userIds)
    : { data: [] }

  const clientById = new Map((clients ?? []).map((c) => [c.id, c]))
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))
  const sent = new Set((logs ?? []).map((l) => String(l.reminder_type).split("|")[0]))

  const results: { feeId: string; stage: string | null; status: string }[] = []

  for (const fee of open) {
    const stage = stageFor(daysBetween(today, fee.due_date))
    if (!stage) {
      results.push({ feeId: fee.id, stage: null, status: "not_in_window" })
      continue
    }
    const key = `fee_${fee.id}_${stage}`
    // Already sent this stage, or a later one (never send an earlier stage after a later one).
    const laterDone = ORDER.slice(ORDER.indexOf(stage)).some((s) => sent.has(`fee_${fee.id}_${s}`))
    if (laterDone) {
      results.push({ feeId: fee.id, stage, status: "already_sent" })
      continue
    }

    const client = clientById.get(fee.client_id)
    const profile = profileById.get(client?.user_id ?? "")
    const phone = profile?.phone?.replace(/\D/g, "") ?? ""
    if (client?.status && client.status !== "active") {
      results.push({ feeId: fee.id, stage, status: "client_not_active" })
      continue
    }
    if (profile?.notifications_enabled === false) {
      results.push({ feeId: fee.id, stage, status: "notifications_off" })
      continue
    }
    if (!phone) {
      results.push({ feeId: fee.id, stage, status: "no_phone" })
      continue
    }
    if (!live) {
      results.push({ feeId: fee.id, stage, status: "would_send" })
      continue
    }

    const res = await sendFeeReminder(
      phone,
      profile?.name ?? "",
      client?.package_name || "",
      prettyDate(fee.due_date),
      stage,
    )
    const ok = res.success && !res.dryRun
    if (ok) {
      await db.from("reminder_log").insert({ client_id: fee.client_id, reminder_type: `${key}|wa:ok` })
      sent.add(key)
    }
    results.push({ feeId: fee.id, stage, status: ok ? "sent" : "failed" })
  }

  return NextResponse.json({ today, live, results })
}

export const GET = run
export const POST = run
