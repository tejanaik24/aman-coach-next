import { NextResponse } from "next/server"
import { automationSupabase, isAuthorizedAutomationRequest } from "@/lib/automation"
import { sendWelcomeEmail } from "@/lib/email"
import { sendWhatsAppText } from "@/lib/whatsapp"

const value = (input: unknown) => typeof input === "string" ? input.trim() : ""

export async function POST(request: Request) {
  if (!isAuthorizedAutomationRequest(request)) return NextResponse.json({ error: "Unauthorized automation request" }, { status: 401 })
  const body = await request.json().catch(() => null)
  const deliveryId = value(body?.deliveryId)
  const eventType = value(body?.eventType)
  const payload = body?.payload as Record<string, unknown> | undefined
  if (!deliveryId || !payload) return NextResponse.json({ error: "Invalid automation event" }, { status: 400 })
  const { data: pending, error: pendingError } = await automationSupabase.from("pending_webhooks").select("id").eq("id", deliveryId).eq("status", "pending").maybeSingle()
  if (pendingError) return NextResponse.json({ error: pendingError.message }, { status: 500 })
  if (!pending) return NextResponse.json({ success: true, duplicate: true })
  try {
    if (eventType === "new_client_welcome") {
      const name = value(payload.display_name), phone = value(payload.phone), email = value(payload.email), setupUrl = value(payload.setupUrl), onboardingUrl = value(payload.onboardingUrl)
      if (!name || !phone || !email || !setupUrl || !onboardingUrl) throw new Error("Invalid welcome event")
      const whatsapp = await sendWhatsAppText(phone, `Welcome to AK Fitness! 🎉\nHi ${name}, set your password here: ${setupUrl}\nThen complete your joining form: ${onboardingUrl}`)
      if (!whatsapp.success) throw new Error(whatsapp.error || "WhatsApp delivery failed")
      await sendWelcomeEmail(email, name, setupUrl)
    } else if (eventType === "coach_feedback") {
      const name = value(payload.clientName), phone = value(payload.phone), feedback = value(payload.feedback)
      if (!name || !phone || !feedback) throw new Error("Invalid coach feedback event")
      const whatsapp = await sendWhatsAppText(phone, `Hi ${name} 👋\n\nCoach Aman has reviewed your check-in.\n\nFeedback: ${feedback}`)
      if (!whatsapp.success) throw new Error(whatsapp.error || "WhatsApp delivery failed")
    } else throw new Error(`Unsupported automation event: ${eventType}`)
    const { error } = await automationSupabase.from("pending_webhooks").update({ status: "sent", last_error: null }).eq("id", deliveryId).eq("status", "pending")
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Automation delivery failed" }, { status: 502 })
  }
}
