import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { withRetry } from "@/lib/db-retry"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const ALERTABLE_FORM_TYPES = ["standard_joining", "antenatal_joining", "checkin"]

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

  const { data: rows, error: fetchError } = await withRetry(() =>
    supabase
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
  )

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const coachPhoneRaw = process.env.AMAN_WHATSAPP || process.env.COACH_WHATSAPP_NUMBER || "919815690656"
  const coachPhone = coachPhoneRaw.replace(/\D/g, "")

  return NextResponse.json({
    success: true,
    coachPhone,
    alerts: (rows || []).map((row) => ({
      id: row.id,
      formType: row.form_type,
      clientName: (row.profiles as any)?.name || "Client",
      submittedAt: row.submitted_at,
    })),
  })
}
