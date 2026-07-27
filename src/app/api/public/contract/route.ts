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
    const clientName = String(body.clientName || "").trim()
    const tel = String(body.tel || "").trim()
    const agreed = Boolean(body.agreed)

    if (!clientName || !tel || !agreed) {
      return NextResponse.json({ error: "Name, phone and agreement checkbox are required" }, { status: 400 })
    }

    const { error: insertError } = await withRetry(() =>
      supabase.from("form_submissions").insert({
        user_id: null,
        client_id: null,
        form_type: "coaching_contract",
        form_data: body,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
    )

    if (insertError) {
      console.error("Contract insert error:", insertError.message)
      return NextResponse.json({ error: "Failed to save contract" }, { status: 500 })
    }

    const coachPhone = process.env.AMAN_WHATSAPP || process.env.COACH_WHATSAPP_NUMBER
    if (coachPhone) {
      sendCoachSubmissionAlert(coachPhone, clientName, "coaching_contract").catch((e) =>
        console.error("Contract WhatsApp alert error:", e)
      )
    } else {
      console.error("AMAN_WHATSAPP/COACH_WHATSAPP_NUMBER not set; skipping coach WhatsApp alert")
    }

    return NextResponse.json({ success: true, message: "Contract submitted" })
  } catch (err: unknown) {
    console.error("Contract API error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
