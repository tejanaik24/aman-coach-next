import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { sendCheckinReminder } from "@/lib/whatsapp"
import { differenceInCalendarDays } from "date-fns"

function todayInIndia(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  const y = parts.find((p) => p.type === "year")?.value
  const m = parts.find((p) => p.type === "month")?.value
  const d = parts.find((p) => p.type === "day")?.value
  return `${y}-${m}-${d}`
}

function parseReminderLogType(reminderType: string): { baseKey: string; succeeded: boolean } {
  const [baseKey, channelInfo] = reminderType.split("|")
  if (!channelInfo) return { baseKey, succeeded: true }
  return { baseKey, succeeded: channelInfo.includes(":ok") }
}

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (me?.role !== "coach") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { followupId, clientId, dueDate } = body as { followupId?: string; clientId?: string; dueDate?: string }
  if (!followupId || !clientId || !dueDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const todayStr = todayInIndia()
  const diff = differenceInCalendarDays(new Date(dueDate + "T00:00:00"), new Date(todayStr + "T00:00:00"))

  // Only send if the new date is 2 days away or less
  if (diff > 2) {
    return NextResponse.json({ sent: false, reason: "not_close_date", diff })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 1. Verify follow-up exists, belongs to this coach, type is checkin, not done, and due_date matches
  const { data: followup } = await admin
    .from("followups")
    .select("id, client_id, coach_id, type, due_date, done_at")
    .eq("id", followupId)
    .single()

  if (!followup) {
    return NextResponse.json({ error: "Follow-up not found" }, { status: 404 })
  }
  if (followup.coach_id !== user.id) {
    return NextResponse.json({ error: "Forbidden: not your follow-up" }, { status: 403 })
  }
  if (followup.type !== "checkin") {
    return NextResponse.json({ error: "Only checkin follow-ups can have check-in reminders" }, { status: 400 })
  }
  if (followup.done_at) {
    return NextResponse.json({ sent: false, reason: "already_completed" })
  }
  if (followup.due_date !== dueDate) {
    return NextResponse.json({ error: "Due date does not match follow-up date" }, { status: 400 })
  }
  if (followup.client_id !== clientId) {
    return NextResponse.json({ error: "Client does not match follow-up" }, { status: 400 })
  }

  // 2. Fetch client & profile
  const { data: client } = await admin
    .from("clients")
    .select("id, user_id, status")
    .eq("id", clientId)
    .eq("coach_id", user.id)
    .single()

  if (!client || !client.user_id) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("name, phone, notifications_enabled")
    .eq("id", client.user_id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  }

  if (profile.notifications_enabled === false) {
    return NextResponse.json({ sent: false, reason: "notifications_disabled" })
  }

  const phone = profile?.phone?.replace(/\D/g, "")
  if (!phone) {
    return NextResponse.json({ sent: false, reason: "no_phone" })
  }

  // 3. Check if a reminder for this followup AND date has already been sent
  const { data: existingLogs } = await admin
    .from("reminder_log")
    .select("reminder_type")
    .eq("client_id", clientId)
    .ilike("reminder_type", `followup_${followupId}_${dueDate}_%`)

  const alreadySent = (existingLogs ?? []).some((r) => parseReminderLogType(r.reminder_type).succeeded)
  if (alreadySent) {
    return NextResponse.json({ sent: false, reason: "already_sent" })
  }

  // 4. Send the checkin_reminder_v2 with the date
  const waRes = await sendCheckinReminder(phone, profile.name ?? "there", undefined, dueDate)
  const waStatus = waRes.success && !waRes.dryRun ? "ok" : "failed"
  const stageKey = `followup_${followupId}_${dueDate}_pre`
  const channelSummary = `wa:${waStatus},email:skipped`

  await admin.from("reminder_log").insert({
    client_id: clientId,
    followup_id: followupId,
    phone,
    message_id: waRes.messageId ?? null,
    status: waStatus === "ok" ? "sent" : "failed",
    error: waStatus === "ok" ? null : (waRes.error ?? "send_failed"),
    reminder_type: `${stageKey}|${channelSummary}`,
    sent_at: new Date().toISOString(),
  })

  if (waStatus === "ok") {
    return NextResponse.json({ sent: true, stageKey, messageId: waRes.messageId })
  }

  return NextResponse.json({ sent: false, error: waRes.error ?? "send_failed" })
}
