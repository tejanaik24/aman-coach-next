import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { automationSupabase as admin } from "@/lib/automation"
import { formatMetaPhone, sendWhatsAppTemplate, sendWhatsAppText, getWhatsAppConfigStatus } from "@/lib/whatsapp"
import { waLink } from "@/lib/quick-manage"

export async function POST(request: Request) {
  try {
    const authSupabase = await createServerClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: coachProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (coachProfile?.role !== "coach") {
      return NextResponse.json({ error: "Forbidden: Coach access required" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const rawPhone = typeof body.phone === "string" ? body.phone.trim() : ""
    const message = typeof body.message === "string" ? body.message.trim() : ""

    if (!rawPhone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const cleanPhone = formatMetaPhone(rawPhone)
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: "Please enter a valid phone number" }, { status: 400 })
    }

    // Check if phone matches any known client
    const { data: matchedProfile } = await admin
      .from("profiles")
      .select("id, name, clients!user_id(id)")
      .or(`phone.eq.${cleanPhone},phone.eq.+${cleanPhone},phone.ilike.%${cleanPhone.slice(-10)}`)
      .limit(1)
      .maybeSingle()

    const rawClients = matchedProfile?.clients as unknown
    const matchedClientId = Array.isArray(rawClients)
      ? (rawClients[0] as { id?: string })?.id ?? null
      : (rawClients as { id?: string } | null)?.id ?? null
    const recipientName = matchedProfile?.name?.trim() || "there"

    const waConfig = getWhatsAppConfigStatus()
    if (!waConfig.configured || waConfig.dryRun) {
      return NextResponse.json({
        success: false,
        error: "WhatsApp API is not configured or in dry-run mode",
        fallbackWaUrl: waLink(cleanPhone, message),
      })
    }

    // Check 24h customer care window (has the user messaged our business number in last 24h?)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const { data: recentInbound } = await admin
      .from("whatsapp_inbound")
      .select("id")
      .eq("from_phone", cleanPhone)
      .gte("received_at", twentyFourHoursAgo)
      .limit(1)

    const within24h = Boolean(recentInbound && recentInbound.length > 0)
    let sendRes: { success: boolean; dryRun?: boolean; messageId?: string; error?: string }
    let usedMethod: "text" | "template" = "text"

    if (within24h) {
      // Free text is allowed within 24h of inbound message
      sendRes = await sendWhatsAppText(cleanPhone, message)
      usedMethod = "text"
    } else {
      // Outside 24h window: Must send via Meta approved template coach_broadcast_update
      usedMethod = "template"
      sendRes = await sendWhatsAppTemplate(cleanPhone, "coach_broadcast_update", "en", [
        {
          type: "body",
          parameters: [
            { type: "text", text: recipientName },
            { type: "text", text: message },
          ],
        },
      ])

      // If template send failed (e.g. unapproved or recipient error), also try text as secondary attempt
      if (!sendRes.success || sendRes.dryRun) {
        const textAttempt = await sendWhatsAppText(cleanPhone, message)
        if (textAttempt.success && !textAttempt.dryRun) {
          sendRes = textAttempt
          usedMethod = "text"
        }
      }
    }

    const success = Boolean(sendRes.success && !sendRes.dryRun)

    // Log message to reminder_log for delivery status tracking
    await admin.from("reminder_log").insert({
      client_id: matchedClientId,
      phone: cleanPhone,
      reminder_type: `direct_message|${usedMethod}`,
      message_id: sendRes.messageId ?? null,
      status: success ? "sent" : "failed",
      error: success ? null : (sendRes.error ?? "Send failed"),
      sent_at: new Date().toISOString(),
    })

    if (success) {
      return NextResponse.json({
        success: true,
        messageId: sendRes.messageId,
        method: usedMethod,
        within24h,
      })
    }

    // Fallback: outside window or failed
    const fallbackWa = waLink(cleanPhone, message)
    return NextResponse.json({
      success: false,
      error: sendRes.error || "Outside 24-hour window and message could not be sent from business number.",
      fallbackWaUrl: fallbackWa,
      outside24h: !within24h,
    })
  } catch (error: unknown) {
    const err = error as { message?: string }
    return NextResponse.json({ error: err.message || "Failed to send message" }, { status: 500 })
  }
}
