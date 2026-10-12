import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { withRetry } from "@/lib/db-retry"
import { isAllowedImage, isRateLimited } from "@/lib/request-guards"
import { sendCoachFormAlert } from "@/lib/whatsapp"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: Request) {
  try {
    if (isRateLimited(request, "consultation")) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
    }
    const formData = await request.formData()
    if (formData.get("clientId") || formData.get("client_id") || formData.get("userId") || formData.get("user_id")) {
      return NextResponse.json(
        { error: "Public form submissions cannot specify a clientId or userId" },
        { status: 403 }
      )
    }
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
      if (!isAllowedImage(screenshot)) {
        return NextResponse.json({ error: "Upload a JPG, PNG, or WebP image no larger than 5 MB" }, { status: 400 })
      }
      const ext = screenshot.type === "image/png" ? "png" : screenshot.type === "image/webp" ? "webp" : "jpg"
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

    let insertedBookingId: string | null = null
    const { data: insertedBooking, error: insertError } = await withRetry(() =>
      supabase.from("form_submissions").insert({
        user_id: null,
        client_id: null,
        form_type: "consultation_booking",
        form_data: { name, countryCode, phone, email, screenshotPath: screenshotUrl },
        status: "submitted",
        submitted_at: new Date().toISOString(),
      }).select("id").maybeSingle()
    )

    if (insertError) {
      console.error("Consultation booking insert error:", insertError.message)
      return NextResponse.json({ error: "Failed to save booking" }, { status: 500 })
    }
    if (insertedBooking?.id) insertedBookingId = insertedBooking.id

    const coachPhoneRaw = process.env.AMAN_WHATSAPP || process.env.COACH_WHATSAPP_NUMBER
    if (coachPhoneRaw) {
      try {
        const coachTarget = { coachPhone: coachPhoneRaw }
        const { isCoachNotificationsEnabled } = await import("@/lib/automation-delivery")
        if (await isCoachNotificationsEnabled(coachTarget)) {
          const coachPhone = coachPhoneRaw.replace(/\D/g, "")
          const alertRes = await sendCoachFormAlert(coachPhone, "consultation_booking", name, coachTarget)
          if (alertRes?.success && !alertRes?.dryRun && insertedBookingId) {
            await withRetry(() =>
              supabase
                .from("form_submissions")
                .update({ coach_alert_sent_at: new Date().toISOString() })
                .eq("id", insertedBookingId)
            )
          }
        }
      } catch (alertErr) {
        console.error("Coach consultation booking alert error:", alertErr)
      }
    }

    return NextResponse.json({ success: true, message: "Consultation call booking submitted and queued for coach review" })
  } catch (err: unknown) {
    console.error("Book consultation API error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
