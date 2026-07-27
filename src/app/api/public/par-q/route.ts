import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendCoachSubmissionAlert } from "@/lib/whatsapp"
import { withRetry } from "@/lib/db-retry"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = String(body.name || "").trim()
    const tel = String(body.tel || "").trim()

    if (!name || !tel) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 })
    }

    const { error: insertError } = await withRetry(() =>
      supabase.from("form_submissions").insert({
        user_id: null,
        client_id: null,
        form_type: "par_q",
        form_data: body,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
    )

    if (insertError) {
      console.error("PAR-Q insert error:", insertError.message)
      return NextResponse.json({ error: "Failed to save PAR-Q" }, { status: 500 })
    }

    const coachPhone = process.env.AMAN_WHATSAPP || process.env.COACH_WHATSAPP_NUMBER
    if (coachPhone) {
      sendCoachSubmissionAlert(coachPhone, name, "par_q").catch((e) =>
        console.error("PAR-Q WhatsApp alert error:", e)
      )
    } else {
      console.error("AMAN_WHATSAPP/COACH_WHATSAPP_NUMBER not set; skipping coach WhatsApp alert")
    }

    return NextResponse.json({ success: true, message: "PAR-Q submitted" })
  } catch (err: unknown) {
    console.error("PAR-Q API error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
