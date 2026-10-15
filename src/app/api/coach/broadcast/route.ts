import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { automationSupabase as db } from "@/lib/automation"
import { getWhatsAppConfigStatus, sendWhatsAppTemplate, sendWhatsAppText } from "@/lib/whatsapp"

const BROADCAST_TEMPLATE_NAME = "coach_broadcast_update"
const INACTIVE_WA_MESSAGE = "WhatsApp automatic sending is not active. Use the Send on WhatsApp buttons."

export async function POST(request: Request) {
  try {
    const authSupabase = await createServerClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: coachProfile } = await db
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (coachProfile?.role !== "coach") {
      return NextResponse.json({ error: "Forbidden: Coach access required" }, { status: 403 })
    }

    const body = await request.json()
    const message = typeof body.message === "string" ? body.message.trim() : ""
    const clientIds: string[] = Array.isArray(body.clientIds) ? body.clientIds : []
    const dryRun = Boolean(body.dryRun)

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }
    if (clientIds.length === 0) {
      return NextResponse.json({ error: "Select at least one client" }, { status: 400 })
    }

    const { data: clients, error: clientsErr } = await db
      .from("clients")
      .select("id, user_id, status")
      .eq("coach_id", user.id)
      .eq("status", "active")
      .in("id", clientIds)

    if (clientsErr) {
      return NextResponse.json({ error: clientsErr.message }, { status: 500 })
    }

    const userIds = (clients ?? []).map((c) => c.user_id).filter(Boolean) as string[]
    const { data: profiles } = userIds.length
      ? await db.from("profiles").select("id, name, phone, notifications_enabled").in("id", userIds)
      : { data: [] }

    const profileMap = new Map(
      ((profiles ?? []) as { id: string; name: string; phone: string | null; notifications_enabled?: boolean }[]).map((p) => [p.id, p])
    )

    const waConfig = getWhatsAppConfigStatus()
    const waInactive = dryRun || !waConfig.configured || waConfig.dryRun

    const results: { clientId: string; name: string; status: string; error?: string }[] = []

    for (const c of clients ?? []) {
      const p = profileMap.get(c.user_id)
      const name = p?.name || "Client"
      // Full name (Aman's request). Variable kept as `firstName` to leave the rest of the loop untouched.
      const firstName = name.trim().replace(/\s+/g, " ") || "there"

      if (p?.notifications_enabled === false) {
        results.push({ clientId: c.id, name, status: "notifications_off" })
        continue
      }

      const phone = p?.phone?.replace(/\D/g, "") || ""
      if (!phone) {
        results.push({ clientId: c.id, name, status: "no_phone" })
        continue
      }

      const personalized = message.replace(/\{\{\s*name\s*\}\}/gi, firstName)

      if (waInactive) {
        results.push({
          clientId: c.id,
          name,
          status: dryRun || waConfig.dryRun ? "dry_run" : "not_configured",
          error: INACTIVE_WA_MESSAGE,
        })
        continue
      }

      const components = [
        {
          type: "body",
          parameters: [
            { type: "text", text: firstName },
            { type: "text", text: personalized },
          ],
        },
      ]

      const tplRes = await sendWhatsAppTemplate(phone, BROADCAST_TEMPLATE_NAME, "en", components)
      if (tplRes.success && !tplRes.dryRun) {
        results.push({ clientId: c.id, name, status: "sent" })
      } else {
        const textRes = await sendWhatsAppText(phone, `Hi ${firstName},\n\n${personalized}\n\n— Coach Aman Khurana`)
        const reallySent = Boolean(textRes.success && !textRes.dryRun)
        results.push({
          clientId: c.id,
          name,
          status: reallySent ? "sent" : (tplRes.dryRun || textRes.dryRun ? "dry_run" : "failed"),
          error: reallySent ? undefined : (tplRes.dryRun || textRes.dryRun ? INACTIVE_WA_MESSAGE : (tplRes.error || textRes.error)),
        })
      }
    }

    const sentCount = results.filter((r) => r.status === "sent").length
    const dryRunCount = results.filter((r) => r.status === "dry_run").length

    if (waInactive || sentCount === 0) {
      return NextResponse.json({
        success: false,
        dryRun: Boolean(dryRun || waConfig.dryRun || dryRunCount > 0),
        notConfigured: !waConfig.configured,
        message: INACTIVE_WA_MESSAGE,
        templateName: BROADCAST_TEMPLATE_NAME,
        sentCount: 0,
        dryRunCount,
        total: results.length,
        results,
      })
    }

    return NextResponse.json({
      success: true,
      dryRun: false,
      templateName: BROADCAST_TEMPLATE_NAME,
      sentCount,
      dryRunCount,
      total: results.length,
      results,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Broadcast failed" },
      { status: 500 }
    )
  }
}

