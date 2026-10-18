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

  // 1. Fetch client & profile
  const { data: client } = await admin
    .from("clients")
    .select("id, user_id, status")
    .eq("id", clientId)
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

  // 2. Check if a reminder for this followup has already been sent
  const { data: existingLogs } = await admin
    .from("reminder_log")
    .select("reminder_type")
    .eq("client_id", clientId)
    .ilike("reminder_type", `followup_${followupId}_%`)

  const alreadySent = (existingLogs ?? []).some((r) => parseReminderLogType(r.reminder_type).succeeded)
  if (alreadySent) {
    return NextResponse.json({ sent: false, reason: "already_sent" })
  }

  // 3. Send the checkin_reminder_v2 with the date
  const waRes = await sendCheckinReminder(phone, profile.name ?? "there", undefined, dueDate)
  const waStatus = waRes.success && !waRes.dryRun ? "ok" : "failed"

  if (waStatus === "ok") {
    const stageKey = `followup_${followupId}_${dueDate}_pre`
    const channelSummary = "wa:ok,email:skipped"
    await admin.from("reminder_log").insert({
      client_id: clientId,
      reminder_type: `${stageKey}|${channelSummary}`,
      sent_at: new Date().toISOString(),
    })
    return NextResponse.json({ sent: true, stageKey })
  }

  return NextResponse.json({ sent: false, error: waRes.error ?? "send_failed" })
}
