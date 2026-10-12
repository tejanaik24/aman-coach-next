import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { withRetry } from "@/lib/db-retry"
import { sendCoachFormAlert } from "@/lib/whatsapp"

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

    if (!formType || !formData || typeof formData !== "object") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // 1. Verify ownership of clientId / userId
    let targetClientId: string | null = null
    let targetCoachId: string | null = null
    let targetUserId: string = user.id
    let clientName = "Client"

    if (clientId !== undefined && clientId !== null && String(clientId).trim() !== "") {
      const requestedClientId = String(clientId).trim()
      const { data: clientRow } = await withRetry(() =>
        supabase
          .from("clients")
          .select("id, user_id, coach_id")
          .eq("id", requestedClientId)
          .maybeSingle()
      )

      const isClientOwner = Boolean(clientRow && clientRow.user_id === user.id)
      const isClientCoach = Boolean(clientRow && clientRow.coach_id === user.id)

      if (!clientRow || (!isClientOwner && !isClientCoach)) {
        return NextResponse.json(
          { error: "Forbidden: You may only submit forms for your own profile or your assigned clients." },
          { status: 403 }
        )
      }

      if (userId && userId !== user.id && userId !== clientRow.user_id) {
        return NextResponse.json(
          { error: "Forbidden: User ID does not match the authenticated user or target client." },
          { status: 403 }
        )
      }

      targetClientId = clientRow.id
      targetCoachId = clientRow.coach_id || null
      targetUserId = clientRow.user_id || user.id
    } else {
      if (!userId) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }
      if (userId !== user.id) {
        return NextResponse.json({ error: "Forbidden: User ID mismatch" }, { status: 403 })
      }
      targetUserId = user.id
      const { data: client } = await withRetry(() =>
        supabase.from("clients").select("id, coach_id").eq("user_id", targetUserId).maybeSingle()
      )
      targetClientId = client?.id || null
      targetCoachId = client?.coach_id || null
    }

    const { data: profile } = await withRetry(() =>
      supabase.from("profiles").select("name, phone").eq("id", targetUserId).maybeSingle()
    )
    if (profile?.name) clientName = profile.name

    // 2. Save submission to form_submissions table
    const submissionRecord = {
      user_id: targetUserId,
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
            user_id: targetUserId,
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
        const photoKeys = ["front_pic", "back_pic", "both_side_pic", "right_side_pic", "fav_pose_pic", "mandatory_pose_pic"]
        const photos = photoKeys.flatMap((k) => (Array.isArray(formData[k]) ? formData[k] : []))

        await withRetry(() =>
          supabase.from("checkins").insert({
            client_id: targetClientId,
            form_data: formData,
            weight: formData.w1_weight || formData.measurements?.weight || null,
            notes: formData.g6_additional_notes || formData.general?.other_notes || null,
            photos,
            submitted_at: new Date().toISOString(),
          })
        )
      } catch (err: unknown) {
        console.warn("checkins table insert note:", err)
      }
    }

    // 4. WhatsApp coach alert is now sent directly here via Meta Cloud API (if coach notifications are enabled)
    const coachPhoneRaw = process.env.AMAN_WHATSAPP || process.env.COACH_WHATSAPP_NUMBER
    if (coachPhoneRaw) {
      try {
        const coachTarget = {
          coachId: targetCoachId,
          clientId: targetClientId,
          userId: targetUserId,
          coachPhone: coachPhoneRaw,
        }
        const { isCoachNotificationsEnabled } = await import("@/lib/automation-delivery")
        if (await isCoachNotificationsEnabled(coachTarget)) {
          const coachPhone = coachPhoneRaw.replace(/\D/g, "")
          const alertRes = await sendCoachFormAlert(coachPhone, formType, clientName, coachTarget)
          if (alertRes?.success && !alertRes?.dryRun && insertedId) {
            await withRetry(() =>
              supabase
                .from("form_submissions")
                .update({ coach_alert_sent_at: new Date().toISOString() })
                .eq("id", insertedId)
            )
          }
        }
      } catch (alertErr) {
        console.error("Coach form alert error:", alertErr)
      }
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
