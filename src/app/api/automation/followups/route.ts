import { NextResponse } from "next/server"
import {
  automationSupabase as db,
  isAuthorizedAutomationRequest,
  todayInIndia,
  daysBetween,
  getUserEmailMap,
} from "@/lib/automation"
import { sendCheckinReminder, sendWhatsAppText } from "@/lib/whatsapp"
import { sendFollowupReminderEmail } from "@/lib/email"
import { isPlaceholderEmail } from "@/lib/phone-login"
import { buildFollowupWaText } from "@/lib/quick-manage"

// Daily job (Vercel cron, ~9am IST):
//  1. closes an old auto-created check-in follow-up once the client has checked in
//  2. Sends stage-separated follow-up reminders (_pre, _due, _late_1..3) respecting notifications_enabled
// Aman sets every check-in date himself (16 Oct): the job no longer creates check-ins, and
// old auto-created ones never message clients.
const REMIND_DAYS_BEFORE = 2
const OVERDUE_COOLDOWN_DAYS = 3
const OVERDUE_MAX_REMINDERS = 3

// Approved Meta templates in this account; only "checkin_reminder" fits client follow-up reminders (for type="checkin").
const APPROVED_WA_TEMPLATES: Record<string, string> = {
  checkin: "checkin_reminder",
}

function toIndiaDateString(isoTimestamp: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoTimestamp))
}

interface FollowupRow {
  id: string
  client_id: string
  type: string
  due_date: string
  note: string | null
  created_at: string
  done_at?: string | null
  auto_created?: boolean | null
}

interface ClientRow {
  id: string
  coach_id: string | null
  start_date: string | null
  user_id: string | null
  email?: string | null
}

interface ReminderLogRow {
  client_id: string
  reminder_type: string
  sent_at: string
}

function parseReminderLogType(reminderType: string): { baseKey: string; succeeded: boolean } {
  const [baseKey, channelInfo] = reminderType.split("|")
  if (!channelInfo) {
    return { baseKey, succeeded: true }
  }
  return { baseKey, succeeded: channelInfo.includes(":ok") }
}

async function run(request: Request) {
  if (!isAuthorizedAutomationRequest(request)) {
    return NextResponse.json({ error: "Unauthorized automation request" }, { status: 401 })
  }

  const url = new URL(request.url)
  let bodyParams: { date?: string; today?: string; clientId?: string } = {}
  if (request.method === "POST") {
    try {
      const parsed = await request.clone().json()
      if (parsed && typeof parsed === "object") {
        bodyParams = parsed as { date?: string; today?: string; clientId?: string }
      }
    } catch {
      // No JSON body provided
    }
  }

  const rawDate = url.searchParams.get("date") ?? url.searchParams.get("today") ?? bodyParams.date ?? bodyParams.today
  const today = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : todayInIndia()
  const filterClientId = url.searchParams.get("clientId") ?? bodyParams.clientId ?? null
  // ?dryRun=1: no database writes and no messages, only lists what would happen.
  const dryRun = url.searchParams.get("dryRun") === "1"
  const simulatedSentAt =
    rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
      ? new Date(`${rawDate}T09:00:00+05:30`).toISOString()
      : new Date().toISOString()

  const since = new Date(Date.parse(`${today}T00:00:00Z`) - 90 * 86_400_000).toISOString()

  let clientsQuery = db.from("clients").select("id, coach_id, start_date, user_id, email").eq("status", "active")
  let openQuery = db
    .from("followups")
    .select("id, client_id, type, due_date, note, created_at, done_at, auto_created")
    .is("done_at", null)
  let checkinsQuery = db.from("checkins").select("client_id, submitted_at").gte("submitted_at", since)

  if (filterClientId) {
    clientsQuery = clientsQuery.eq("id", filterClientId)
    openQuery = openQuery.eq("client_id", filterClientId)
    checkinsQuery = checkinsQuery.eq("client_id", filterClientId)
  }

  const [clientsRes, openRes, checkinsRes] = await Promise.all([clientsQuery, openQuery, checkinsQuery])
  const err = clientsRes.error ?? openRes.error ?? checkinsRes.error
  if (err) return NextResponse.json({ error: err.message }, { status: 500 })

  const activeClients = (clientsRes.data ?? []) as ClientRow[]
  const lastCheckin = new Map<string, string>()
  for (const c of checkinsRes.data ?? []) {
    const prev = lastCheckin.get(c.client_id)
    if (!prev || c.submitted_at > prev) lastCheckin.set(c.client_id, c.submitted_at)
  }

  // Done follow-ups never remind
  const allOpen = ((openRes.data ?? []) as FollowupRow[]).filter((f) => !f.done_at)
  const openCheckinByClient = new Map<string, FollowupRow>()
  for (const f of allOpen) {
    if (f.type !== "checkin") continue
    const prev = openCheckinByClient.get(f.client_id)
    if (!prev || f.due_date < prev.due_date) openCheckinByClient.set(f.client_id, f)
  }


  let closed = 0
  for (const client of activeClients) {
    if (!client.coach_id) continue
    const last = lastCheckin.get(client.id)
    const open = openCheckinByClient.get(client.id)

    if (open && open.auto_created && last && last > open.created_at) {
      const { error } = dryRun
        ? { error: null }
        : await db
            .from("followups")
            .update({ result: "successful", done_at: simulatedSentAt })
            .eq("id", open.id)
      if (!error) {
        closed++
        open.done_at = simulatedSentAt
      }
    }

  }

  const clientById = new Map(activeClients.map((c) => [c.id, c]))
  const clientIds = [...new Set(allOpen.map((f) => f.client_id))]
  const userIds = [...new Set(clientIds.map((id) => clientById.get(id)?.user_id).filter((v): v is string => Boolean(v)))]

  const [loggedRes, profilesRes, emailByUserId] = clientIds.length
    ? await Promise.all([
        db.from("reminder_log").select("client_id, reminder_type, sent_at").in("client_id", clientIds),
        userIds.length
          ? db.from("profiles").select("id, name, phone, notifications_enabled").in("id", userIds)
          : Promise.resolve({ data: [] }),
        getUserEmailMap(userIds),
      ])
    : [{ data: [] }, { data: [] }, new Map<string, string>()]

  const logRows = (loggedRes.data ?? []) as ReminderLogRow[]
  const successfulStageKeys = new Set<string>()
  const lateLogsByFollowup = new Map<string, { stageKey: string; sentDate: string }[]>()

  for (const row of logRows) {
    const { baseKey, succeeded } = parseReminderLogType(row.reminder_type)
    if (!succeeded) continue
    successfulStageKeys.add(`${row.client_id}:${baseKey}`)

    const lateMatch = baseKey.match(/^followup_([0-9a-f-]+)_(\d{4}-\d{2}-\d{2})_late_(\d+)$/i)
    if (lateMatch) {
      const followupKey = `${lateMatch[1]}_${lateMatch[2]}`
      const list = lateLogsByFollowup.get(followupKey) ?? []
      list.push({ stageKey: baseKey, sentDate: toIndiaDateString(row.sent_at) })
      lateLogsByFollowup.set(followupKey, list)
    }
  }

  const profileById = new Map(
    ((profilesRes.data ?? []) as { id: string; name: string; phone: string | null; notifications_enabled?: boolean }[]).map((p) => [p.id, p])
  )

  const reminders: {
    followupId: string
    clientId: string
    type: string
    dueDate: string
    stage?: string
    channels?: string
    status: string
  }[] = []

  // One message per client per run: a client with several due follow-ups (e.g. 3 check-ins)
  // used to get one WhatsApp each. Check-in follow-ups go first so the check-in template wins.
  const notifiedClients = new Set<string>()
  allOpen.sort(
    (x, y) => Number(y.type === "checkin") - Number(x.type === "checkin") || x.due_date.localeCompare(y.due_date)
  )

  for (const f of allOpen) {
    if (f.done_at || f.auto_created) continue

    const diff = daysBetween(today, f.due_date)
    if (diff > REMIND_DAYS_BEFORE) {
      reminders.push({
        followupId: f.id,
        clientId: f.client_id,
        type: f.type,
        dueDate: f.due_date,
        status: "skipped_not_due",
      })
      continue
    }

    const client = clientById.get(f.client_id)
    const profile = profileById.get(client?.user_id ?? "")
    if (profile?.notifications_enabled === false) {
      reminders.push({
        followupId: f.id,
        clientId: f.client_id,
        type: f.type,
        dueDate: f.due_date,
        status: "notifications_off",
      })
      continue
    }

    // Determine stage-specific key:
    //  - diff in 1..2 => _pre ("before due")
    //  - diff === 0   => _due ("due today")
    //  - diff < 0     => _late_<1..3> ("overdue", at most once every 3 days, stop after 3 overdue reminders)
    let stageKey = ""
    const followupLateKey = `${f.id}_${f.due_date}`
    if (diff > 0) {
      stageKey = `followup_${f.id}_${f.due_date}_pre`
      if (successfulStageKeys.has(`${f.client_id}:${stageKey}`)) {
        reminders.push({
          followupId: f.id,
          clientId: f.client_id,
          type: f.type,
          dueDate: f.due_date,
          stage: "pre",
          status: "skipped_already",
        })
        continue
      }
    } else if (diff === 0) {
      stageKey = `followup_${f.id}_${f.due_date}_due`
      // Check-ins: Aman's reminder goes 2 days before, not again on the day (only if the early one went out).
      const preSent = successfulStageKeys.has(`${f.client_id}:followup_${f.id}_${f.due_date}_pre`)
      if (successfulStageKeys.has(`${f.client_id}:${stageKey}`) || (f.type === "checkin" && preSent)) {
        reminders.push({
          followupId: f.id,
          clientId: f.client_id,
          type: f.type,
          dueDate: f.due_date,
          stage: "due",
          status: "skipped_already",
        })
        continue
      }
    } else {
      const priorLate = lateLogsByFollowup.get(followupLateKey) ?? []
      if (priorLate.length >= OVERDUE_MAX_REMINDERS) {
        reminders.push({
          followupId: f.id,
          clientId: f.client_id,
          type: f.type,
          dueDate: f.due_date,
          stage: "late_max_reached",
          status: "skipped_already",
        })
        continue
      }
      if (priorLate.length > 0) {
        const latestSentDate = priorLate.reduce(
          (maxDate, item) => (item.sentDate > maxDate ? item.sentDate : maxDate),
          priorLate[0].sentDate
        )
        if (daysBetween(latestSentDate, today) < OVERDUE_COOLDOWN_DAYS) {
          reminders.push({
            followupId: f.id,
            clientId: f.client_id,
            type: f.type,
            dueDate: f.due_date,
            stage: `late_${priorLate.length}`,
            status: "skipped_already",
          })
          continue
        }
      }
      const nextLateNum = priorLate.length + 1
      stageKey = `followup_${f.id}_${f.due_date}_late_${nextLateNum}`
      if (successfulStageKeys.has(`${f.client_id}:${stageKey}`)) {
        reminders.push({
          followupId: f.id,
          clientId: f.client_id,
          type: f.type,
          dueDate: f.due_date,
          stage: `late_${nextLateNum}`,
          status: "skipped_already",
        })
        continue
      }
    }

    const phone = profile?.phone?.replace(/\D/g, "") ?? ""
    const rawEmail = client?.email || (client?.user_id ? emailByUserId.get(client.user_id) : undefined) || ""
    const realEmail = rawEmail && !isPlaceholderEmail(rawEmail) ? rawEmail : ""

    if (!phone && !realEmail) {
      reminders.push({
        followupId: f.id,
        clientId: f.client_id,
        type: f.type,
        dueDate: f.due_date,
        status: "no_phone",
      })
      continue
    }

    const clientName = profile?.name ?? "there"
    const approvedTemplate = APPROVED_WA_TEMPLATES[f.type]
    let waStatus: "ok" | "failed" | "no_phone" = phone ? "failed" : "no_phone"
    let emailStatus: "ok" | "failed" | "no_email" | "skipped" = realEmail ? "skipped" : "no_email"

    // Already messaged this client in this run: log this follow-up as handled, send nothing.
    const merged = notifiedClients.has(f.client_id)

    if (dryRun && !merged) {
      notifiedClients.add(f.client_id)
      reminders.push({
        followupId: f.id,
        clientId: f.client_id,
        type: f.type,
        dueDate: f.due_date,
        stage: stageKey.replace(`followup_${f.id}_${f.due_date}_`, ""),
        channels: approvedTemplate ? "wa:checkin_reminder_v2" : "wa:text",
        status: "would_send",
      })
      continue
    }

    if (merged) {
      // nothing to send
    } else if (approvedTemplate === "checkin_reminder") {
      if (phone) {
        const waRes = await sendCheckinReminder(phone, clientName, undefined, f.due_date)
        waStatus = waRes.success && !waRes.dryRun ? "ok" : "failed"
      }
      if (waStatus !== "ok" && realEmail) {
        const emailRes = await sendFollowupReminderEmail(realEmail, clientName, f.type, f.due_date, f.note)
        emailStatus = emailRes.success && !emailRes.dryRun ? "ok" : "failed"
      }
    } else {
      // Non-"checkin" types (payment, renewal, feedback, other, birthday):
      // No approved Meta template fits; attempt free-text WhatsApp AND also send email fallback when client has a real email.
      if (phone) {
        const waRes = await sendWhatsAppText(phone, buildFollowupWaText(clientName, f.type, f.due_date, f.note))
        waStatus = waRes.success && !waRes.dryRun ? "ok" : "failed"
      }
      if (realEmail) {
        const emailRes = await sendFollowupReminderEmail(realEmail, clientName, f.type, f.due_date, f.note)
        emailStatus = emailRes.success && !emailRes.dryRun ? "ok" : "failed"
      }
    }

    // "merged:ok" keeps parseReminderLogType treating it as a success so it is not retried tomorrow.
    const channelSummary = merged ? "merged:ok" : `wa:${waStatus},email:${emailStatus}`
    const logReminderType = `${stageKey}|${channelSummary}`
    const sendSucceeded = merged || waStatus === "ok" || emailStatus === "ok"
    if (sendSucceeded) notifiedClients.add(f.client_id)

    if (sendSucceeded && !dryRun) {
      await db.from("reminder_log").insert({
        client_id: f.client_id,
        reminder_type: logReminderType,
        sent_at: simulatedSentAt,
      })
      successfulStageKeys.add(`${f.client_id}:${stageKey}`)
      if (diff < 0) {
        const list = lateLogsByFollowup.get(followupLateKey) ?? []
        list.push({ stageKey, sentDate: today })
        lateLogsByFollowup.set(followupLateKey, list)
      }
    }

    reminders.push({
      followupId: f.id,
      clientId: f.client_id,
      type: f.type,
      dueDate: f.due_date,
      stage: stageKey.replace(`followup_${f.id}_${f.due_date}_`, ""),
      channels: channelSummary,
      status: merged ? "merged" : sendSucceeded ? "sent" : "failed",
    })
  }

  return NextResponse.json({ today, dryRun, created: 0, closed, reminders })
}

// Vercel cron calls GET; manual/n8n calls can use POST.
export const GET = run
export const POST = run

