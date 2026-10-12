import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { withRetry } from "@/lib/db-retry"
import { isRateLimited } from "@/lib/request-guards"
import { sendCoachFormAlert } from "@/lib/whatsapp"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
)

export async function POST(request: Request) {
  try {
    if (isRateLimited(request, "questionnaire")) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
    }
    const body = await request.json()
    if (body.clientId || body.client_id || body.userId || body.user_id) {
      return NextResponse.json(
        { error: "Public form submissions cannot specify a clientId or userId" },
        { status: 403 }
      )
    }
    const name = String(body.name || "").trim()
    const tel = String(body.tel || "").trim()

    if (!name || !tel) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 })
    }

    let insertedQuestId: string | null = null
    const { data: insertedQuest, error: insertError } = await withRetry(() =>
      supabase.from("form_submissions").insert({
        user_id: null,
        client_id: null,
        form_type: "standard_joining",
        form_data: { name, tel, ...body },
        status: "submitted",
        submitted_at: new Date().toISOString(),
      }).select("id").maybeSingle()
    )

    if (insertError) {
      console.error("Public questionnaire insert error:", insertError.message)
      return NextResponse.json({ error: "Failed to save questionnaire" }, { status: 500 })
    }
    if (insertedQuest?.id) insertedQuestId = insertedQuest.id

    const coachPhoneRaw = process.env.AMAN_WHATSAPP || process.env.COACH_WHATSAPP_NUMBER
    if (coachPhoneRaw) {
      try {
        const coachTarget = { coachPhone: coachPhoneRaw }
        const { isCoachNotificationsEnabled } = await import("@/lib/automation-delivery")
        if (await isCoachNotificationsEnabled(coachTarget)) {
          const coachPhone = coachPhoneRaw.replace(/\D/g, "")
          const alertRes = await sendCoachFormAlert(coachPhone, "standard_joining", name, coachTarget)
          if (alertRes?.success && !alertRes?.dryRun && insertedQuestId) {
            await withRetry(() =>
              supabase
                .from("form_submissions")
                .update({ coach_alert_sent_at: new Date().toISOString() })
                .eq("id", insertedQuestId)
            )
          }
        }
      } catch (alertErr) {
        console.error("Coach questionnaire alert error:", alertErr)
      }
    }

    return NextResponse.json({ success: true, message: "Questionnaire submitted and queued for coach review" })
  } catch (err: unknown) {
    console.error("Public questionnaire API error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
