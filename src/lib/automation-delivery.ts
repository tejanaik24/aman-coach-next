import { automationSupabase } from "@/lib/automation"
import { sendWelcomeEmail } from "@/lib/email"
import { sendCheckinReviewedTemplate, sendWelcomeSetupTemplate } from "@/lib/whatsapp"
import { SITE_URL } from "@/lib/site"

const value = (input: unknown) => typeof input === "string" ? input.trim() : ""

export async function deliverAutomationEvent(
  deliveryId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; duplicate?: boolean }> {
  const cleanDeliveryId = value(deliveryId)
  const cleanEventType = value(eventType)
  if (!cleanDeliveryId || !payload) {
    throw new Error("Invalid automation event")
  }

  const { data: pending, error: pendingError } = await automationSupabase
    .from("pending_webhooks")
    .select("id")
    .eq("id", cleanDeliveryId)
    .eq("status", "pending")
    .maybeSingle()

  if (pendingError) throw new Error(pendingError.message)
  if (!pending) return { success: true, duplicate: true }

  try {
    if (cleanEventType === "new_client_welcome") {
      const name = value(payload.display_name)
      const phone = value(payload.phone)
      const email = value(payload.email)
      const setupUrl = value(payload.setupUrl)
      const onboardingUrl = value(payload.onboardingUrl)

      if (!name || !phone || !setupUrl || !onboardingUrl) {
        throw new Error("Invalid welcome event")
      }

      const whatsapp = await sendWelcomeSetupTemplate(phone, name, setupUrl, onboardingUrl)
      if (!whatsapp.success) {
        throw new Error(whatsapp.error || "WhatsApp delivery failed")
      }

      if (email) {
        await sendWelcomeEmail(email, name, setupUrl)
      }
    } else if (cleanEventType === "coach_feedback") {
      const name = value(payload.clientName)
      const phone = value(payload.phone)
      const feedback = value(payload.feedback)

      if (!name || !phone || !feedback) {
        throw new Error("Invalid coach feedback event")
      }

      const link = `${SITE_URL}/home`
      const whatsapp = await sendCheckinReviewedTemplate(phone, name, link, feedback)
      if (!whatsapp.success) {
        throw new Error(whatsapp.error || "WhatsApp delivery failed")
      }
    } else {
      throw new Error(`Unsupported automation event: ${cleanEventType}`)
    }

    const { error } = await automationSupabase
      .from("pending_webhooks")
      .update({ status: "sent", last_error: null })
      .eq("id", cleanDeliveryId)
      .eq("status", "pending")

    if (error) throw error
    return { success: true }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Automation delivery failed"
    await automationSupabase
      .from("pending_webhooks")
      .update({ last_error: errorMsg })
      .eq("id", cleanDeliveryId)
      .eq("status", "pending")
    throw error
  }
}

