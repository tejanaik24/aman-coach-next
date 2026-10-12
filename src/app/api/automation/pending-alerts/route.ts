import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { withRetry } from "@/lib/db-retry"
import { isCoachNotificationsEnabled } from "@/lib/automation-delivery"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const ALERTABLE_FORM_TYPES = [
  "standard_joining",
  "antenatal_joining",
  "checkin",
  "feedback",
  "coaching_contract",
  "par_q",
  "consultation_booking",
]

export async function GET(req: Request) {
  return handlePendingAlerts(req)
}

export async function POST(req: Request) {
  return handlePendingAlerts(req)
}

async function handlePendingAlerts(req: Request) {
  const authHeader = req.headers.get("authorization")
  const secretHeader =
    req.headers.get("x-automation-secret") ?? req.headers.get("x-webhook-secret")
  const secretParam = new URL(req.url).searchParams.get("secret")
  const expectedSecret = process.env.AUTOMATION_SECRET

  if (!expectedSecret) {
    return NextResponse.json({ error: "AUTOMATION_SECRET environment variable is missing" }, { status: 500 })
  }

  if (secretHeader !== expectedSecret && secretParam !== expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized automation request" }, { status: 401 })
  }

  const coachPhoneRaw = process.env.AMAN_WHATSAPP || process.env.COACH_WHATSAPP_NUMBER
  if (!coachPhoneRaw) {
    return NextResponse.json({ error: "Coach WhatsApp number is not configured" }, { status: 500 })
  }
  const coachPhone = coachPhoneRaw.replace(/\D/g, "")

  const url = new URL(req.url)
  const requestedCoachId = url.searchParams.get("coachId")
  const requestedClientId = url.searchParams.get("clientId")

  if (requestedCoachId && !(await isCoachNotificationsEnabled({ coachId: requestedCoachId }))) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "coach_notifications_off",
      coachId: requestedCoachId,
      coachPhone,
      alerts: [],
    })
  }

  const { data: rows, error: fetchError } = await withRetry(() => {
    let q = supabase
      .from("form_submissions")
      .select(`
        id,
        client_id,
        user_id,
        form_type,
        submitted_at,
        profiles!user_id ( name )
      `)
      .in("form_type", ALERTABLE_FORM_TYPES)
      .is("coach_alert_sent_at", null)
      .order("submitted_at", { ascending: true })
      .limit(50)
    if (requestedClientId) {
      q = q.eq("client_id", requestedClientId)
    }
    return q
  })

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const submissionRows = rows || []
  const clientIds = [...new Set(submissionRows.map((r) => r.client_id).filter((v): v is string => Boolean(v)))]
  const userIds = [...new Set(submissionRows.map((r) => r.user_id).filter((v): v is string => Boolean(v)))]

  const [byIdRes, byUserRes] = await Promise.all([
    clientIds.length
      ? supabase.from("clients").select("id, user_id, coach_id").in("id", clientIds)
      : Promise.resolve({ data: [] as { id: string; user_id: string | null; coach_id: string | null }[] }),
    userIds.length
      ? supabase.from("clients").select("id, user_id, coach_id").in("user_id", userIds)
      : Promise.resolve({ data: [] as { id: string; user_id: string | null; coach_id: string | null }[] }),
  ])

  const coachByClientId = new Map<string, string>()
  const coachByUserId = new Map<string, string>()
  for (const c of [...(byIdRes.data ?? []), ...(byUserRes.data ?? [])]) {
    if (c.id && c.coach_id) coachByClientId.set(c.id, c.coach_id)
    if (c.user_id && c.coach_id) coachByUserId.set(c.user_id, c.coach_id)
  }

  const alerts: {
    id: string
    formType: string
    clientName: string
    coachId: string | null
    submittedAt: string
  }[] = []
  let skippedByCoachOff = 0

  for (const row of submissionRows) {
    const resolvedCoachId =
      (row.client_id ? coachByClientId.get(row.client_id) : undefined) ??
      (row.user_id ? coachByUserId.get(row.user_id) : undefined) ??
      requestedCoachId ??
      null

    if (requestedCoachId && resolvedCoachId && resolvedCoachId !== requestedCoachId) {
      continue
    }

    const enabled = await isCoachNotificationsEnabled({
      coachId: resolvedCoachId,
      clientId: row.client_id,
      userId: row.user_id,
      coachPhone: coachPhoneRaw,
    })
    if (!enabled) {
      skippedByCoachOff++
      continue
    }

    const prof = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    alerts.push({
      id: row.id,
      formType: row.form_type,
      clientName: (prof as { name?: string } | null)?.name || "Client",
      coachId: resolvedCoachId,
      submittedAt: row.submitted_at,
    })
  }

  if (alerts.length === 0 && (skippedByCoachOff > 0 || !(await isCoachNotificationsEnabled({ coachPhone: coachPhoneRaw })))) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "coach_notifications_off",
      coachPhone,
      alerts: [],
    })
  }

  return NextResponse.json({
    success: true,
    coachPhone,
    skippedCount: skippedByCoachOff,
    alerts,
  })
}
