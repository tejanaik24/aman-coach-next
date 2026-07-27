import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendEnquiryAlert } from "@/lib/whatsapp"
import { withRetry } from "@/lib/db-retry"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = String(body.name || "").trim()
    const countryCode = String(body.countryCode || "+91").trim()
    const phone = String(body.phone || "").trim()
    const email = String(body.email || "").trim()
    const interest = String(body.interest || "").trim()
    const heardFrom = String(body.heardFrom || "").trim()

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and mobile number are required" }, { status: 400 })
    }

    const { error: insertError } = await withRetry(() =>
      supabase.from("form_submissions").insert({
        user_id: null,
        client_id: null,
        form_type: "enquiry",
        form_data: { name, countryCode, phone, email, interest, heardFrom },
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
    )

    if (insertError) {
      console.error("Enquiry insert error:", insertError.message)
      return NextResponse.json({ error: "Failed to save enquiry" }, { status: 500 })
    }

    const coachPhone = process.env.AMAN_WHATSAPP || process.env.COACH_WHATSAPP_NUMBER
    if (coachPhone) {
      sendEnquiryAlert(coachPhone, name, `${countryCode}${phone}`, interest)
        .catch((e) => console.error("Enquiry WhatsApp alert error:", e))
    } else {
      console.error("AMAN_WHATSAPP/COACH_WHATSAPP_NUMBER not set; skipping coach WhatsApp alert")
    }

    return NextResponse.json({ success: true, message: "Enquiry submitted" })
  } catch (err: unknown) {
    console.error("Enquiry API error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
