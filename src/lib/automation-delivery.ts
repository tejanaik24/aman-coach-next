import { automationSupabase } from "@/lib/automation"
import { sendWelcomeEmail } from "@/lib/email"
import { sendCheckinReviewedTemplate, sendWelcomeSetupTemplate } from "@/lib/whatsapp"
import { SITE_URL } from "@/lib/site"

const value = (input: unknown) => typeof input === "string" ? input.trim() : ""

export interface CoachNotificationTarget {
  coachId?: string | null
  clientId?: string | null
  userId?: string | null
  coachPhone?: string | null
}

export async function isCoachNotificationsEnabled(
  target?: string | CoachNotificationTarget | null
): Promise<boolean> {
  try {
    const opts: CoachNotificationTarget =
      typeof target === "string" ? { coachId: target } : target ?? {}

    let resolvedCoachId = value(opts.coachId)

    if (!resolvedCoachId && value(opts.clientId)) {
      const { data: clientRow } = await automationSupabase
        .from("clients")
        .select("coach_id")
        .eq("id", value(opts.clientId))
        .maybeSingle()
      if (clientRow?.coach_id) resolvedCoachId = clientRow.coach_id
    }

    if (!resolvedCoachId && value(opts.userId)) {
      const { data: clientRow } = await automationSupabase
        .from("clients")
        .select("coach_id")
        .eq("user_id", value(opts.userId))
        .maybeSingle()
      if (clientRow?.coach_id) resolvedCoachId = clientRow.coach_id
    }

    if (!resolvedCoachId && value(opts.coachPhone)) {
      const digits = value(opts.coachPhone).replace(/\D/g, "").slice(-10)
      if (digits.length === 10) {
        const { data: phoneCoaches } = await automationSupabase
          .from("profiles")
          .select("id, notifications_enabled")
          .eq("role", "coach")
          .ilike("phone", `%${digits}`)
        if (phoneCoaches && phoneCoaches.length === 1) {
          return phoneCoaches[0].notifications_enabled !== false
        }
      }
    }

    if (resolvedCoachId) {
      const { data } = await automationSupabase
        .from("profiles")
        .select("notifications_enabled")
        .eq("id", resolvedCoachId)
        .maybeSingle()
      if (!data) return true
      return data.notifications_enabled !== false
    }

    const { data } = await automationSupabase
      .from("profiles")
      .select("id, notifications_enabled")
      .eq("role", "coach")
    if (!data || data.length === 0) return true
    if (data.length === 1) {
      return data[0].notifications_enabled !== false
    }
    return false
  } catch {
    return true
  }
}

async function isClientNotificationsEnabled(userId: string, phone: string): Promise<boolean> {
  try {
    if (userId) {
      const { data } = await automationSupabase
        .from("profiles")
        .select("notifications_enabled")
        .eq("id", userId)
        .maybeSingle()
      if (data && typeof data.notifications_enabled === "boolean") {
        return data.notifications_enabled
      }
    }
    const digits = phone.replace(/\D/g, "").slice(-10)
    if (digits.length === 10) {
      const { data } = await automationSupabase
        .from("profiles")
        .select("notifications_enabled")
        .ilike("phone", `%${digits}`)
        .limit(1)
        .maybeSingle()
      if (data && typeof data.notifications_enabled === "boolean") {
        return data.notifications_enabled
      }
    }
    return true
  } catch {
    return true
  }
}

export async function deliverAutomationEvent(
  deliveryId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; duplicate?: boolean; skipped?: boolean }> {
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
    const targetUserId = value(payload.userId)
    const targetPhone = value(payload.phone)
    const enabled = await isClientNotificationsEnabled(targetUserId, targetPhone)
    if (!enabled) {
      await automationSupabase
        .from("pending_webhooks")
        .update({ status: "sent", last_error: "Skipped: notifications disabled by user" })
        .eq("id", cleanDeliveryId)
        .eq("status", "pending")
      return { success: true, skipped: true }
    }

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
      if (!whatsapp.success || whatsapp.dryRun) {
        throw new Error(whatsapp.error || "WhatsApp delivery failed")
      }

      if (email) {
        const emailRes = await sendWelcomeEmail(email, name, setupUrl)
        if (!emailRes.success && !emailRes.skipped) {
          throw new Error(emailRes.error || "Welcome email delivery failed")
        }
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
      if (!whatsapp.success || whatsapp.dryRun) {
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

