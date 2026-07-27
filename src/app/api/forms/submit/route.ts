import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { sendCoachSubmissionAlert } from "@/lib/whatsapp"
import { withRetry } from "@/lib/db-retry"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  try {
    const authSupabase = await createServerClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { userId, clientId, formType, formData } = body

    if (!userId || !formType || !formData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (userId !== user.id) {
      return NextResponse.json({ error: "Forbidden: User ID mismatch" }, { status: 403 })
    }

    // 1. Get client or profile info
    let targetClientId = clientId
    let clientName = "Client"

    if (!targetClientId && userId) {
      const { data: client } = await withRetry(() =>
        supabase.from("clients").select("id").eq("user_id", userId).maybeSingle()
      )
      targetClientId = client?.id || null
    }

    const { data: profile } = await withRetry(() =>
      supabase.from("profiles").select("name, phone").eq("id", userId).maybeSingle()
    )
    if (profile?.name) clientName = profile.name

    // 2. Save submission to form_submissions table
    const submissionRecord = {
      user_id: userId,
      client_id: targetClientId,
      form_type: formType,
      form_data: formData,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    }

    let insertedId = null
    const { data: inserted, error: subErr } = await withRetry(() =>
      supabase.from("form_submissions").insert(submissionRecord).select("id").maybeSingle()
    )

    if (inserted?.id) insertedId = inserted.id

    if (subErr) {
      console.warn("form_submissions insert warning:", subErr.message)
      // Fallback insert to onboarding_forms if form_submissions fails
      try {
        await withRetry(() =>
          supabase.from("onboarding_forms").upsert({
            user_id: userId,
            form_type: formType,
            data: formData,
            status: "submitted",
            submitted_at: new Date().toISOString(),
          }, { onConflict: "user_id" })
        )
      } catch (e) {
        console.warn("onboarding_forms fallback error:", e)
      }
    }

    // 3. If checkin form, also save to checkins table
    if (formType === "checkin" && targetClientId) {
      try {
        await withRetry(() =>
          supabase.from("checkins").insert({
            client_id: targetClientId,
            form_data: formData,
            weight: formData.w1_weight || formData.measurements?.weight || null,
            notes: formData.g6_additional_notes || formData.general?.other_notes || null,
            submitted_at: new Date().toISOString(),
          })
        )
      } catch (err: unknown) {
        console.warn("checkins table insert note:", err)
      }
    }

    // 4. Send WhatsApp Notification to Coach via WAHA
    const coachPhone = process.env.AMAN_WHATSAPP || process.env.COACH_WHATSAPP_NUMBER
    if (!coachPhone) {
      console.error("AMAN_WHATSAPP/COACH_WHATSAPP_NUMBER not set; skipping coach WhatsApp alert")
    } else {
      sendCoachSubmissionAlert(coachPhone, clientName, formType)
        .catch(e => console.error("WAHA alert error:", e))
    }

    return NextResponse.json({
      success: true,
      submissionId: insertedId,
      message: "Form submitted successfully"
    })
  } catch (error: unknown) {
    console.error("Submit API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
