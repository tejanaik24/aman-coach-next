import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendConsultationBookingAlert } from "@/lib/whatsapp"
import { withRetry } from "@/lib/db-retry"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const name = String(formData.get("name") || "").trim()
    const countryCode = String(formData.get("countryCode") || "+91").trim()
    const phone = String(formData.get("phone") || "").trim()
    const email = String(formData.get("email") || "").trim()
    const screenshot = formData.get("screenshot") as File | null

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and mobile number are required" }, { status: 400 })
    }

    let screenshotUrl: string | null = null
    if (screenshot && screenshot.size > 0) {
      const ext = screenshot.name.split(".").pop() || "jpg"
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from("consultation-proofs")
        .upload(path, screenshot, { contentType: screenshot.type })

      if (uploadError) {
        console.error("Screenshot upload failed:", uploadError.message)
      } else {
        screenshotUrl = path
      }
    }

    const { error: insertError } = await withRetry(() =>
      supabase.from("form_submissions").insert({
        user_id: null,
        client_id: null,
        form_type: "consultation_booking",
        form_data: { name, countryCode, phone, email, screenshotPath: screenshotUrl },
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
    )

    if (insertError) {
      console.error("Consultation booking insert error:", insertError.message)
      return NextResponse.json({ error: "Failed to save booking" }, { status: 500 })
    }

    const coachPhone = process.env.AMAN_WHATSAPP || process.env.COACH_WHATSAPP_NUMBER
    if (coachPhone) {
      sendConsultationBookingAlert(coachPhone, name, `${countryCode}${phone}`, email)
        .catch((e) => console.error("Consultation WhatsApp alert error:", e))
    } else {
      console.error("AMAN_WHATSAPP/COACH_WHATSAPP_NUMBER not set; skipping coach WhatsApp alert")
    }

    return NextResponse.json({ success: true, message: "Consultation call booking submitted" })
  } catch (err: unknown) {
    console.error("Book consultation API error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
