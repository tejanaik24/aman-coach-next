import { NextResponse } from "next/server"
import webpush from "web-push"
import { createClient } from "@supabase/supabase-js"
import { isAuthorizedAutomationRequest } from "@/lib/automation"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  try {
    if (!isAuthorizedAutomationRequest(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { client_id, title, body, url } = await req.json()
    if (!title || !body) return NextResponse.json({ error: "Missing title or body" }, { status: 400 })

    if (client_id) {
      const { data: clientRow } = await supabase
        .from("clients")
        .select("user_id")
        .eq("id", client_id)
        .maybeSingle()
      if (clientRow?.user_id) {
        const { data: profRow } = await supabase
          .from("profiles")
          .select("notifications_enabled")
          .eq("id", clientRow.user_id)
          .maybeSingle()
        if (profRow?.notifications_enabled === false) {
          return NextResponse.json({ sent: 0, failed: 0, skipped: 1, reason: "notifications_off" })
        }
      }
    }

    let query = supabase.from("push_subscriptions").select("client_id, subscription")
    // No client_id = all clients; coach phones (client_id NULL) never get client broadcasts
    query = client_id ? query.eq("client_id", client_id) : query.not("client_id", "is", null)

    const { data: rows, error: fetchErr } = await query
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    if (!rows || rows.length === 0) return NextResponse.json({ sent: 0, failed: 0 })

    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY || ""
    const vapidEmail = process.env.VAPID_EMAIL || "mailto:coach@akfitness.in"
    webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate)

    const subClientIds = [...new Set(rows.map((r) => r.client_id).filter(Boolean) as string[])]
    const disabledClientIds = new Set<string>()
    if (subClientIds.length > 0) {
      const { data: cRows } = await supabase
        .from("clients")
        .select("id, user_id")
        .in("id", subClientIds)
      const uIds = [...new Set((cRows ?? []).map((c) => c.user_id).filter(Boolean) as string[])]
      if (uIds.length > 0) {
        const { data: pRows } = await supabase
          .from("profiles")
          .select("id, notifications_enabled")
          .in("id", uIds)
        const disabledUsers = new Set(
          (pRows ?? []).filter((p) => p.notifications_enabled === false).map((p) => p.id)
        )
        for (const c of cRows ?? []) {
          if (c.user_id && disabledUsers.has(c.user_id)) {
            disabledClientIds.add(c.id)
          }
        }
      }
    }

    let sent = 0
    let failed = 0
    let skipped = 0

    await Promise.all(
      rows.map(async (row) => {
        if (row.client_id && disabledClientIds.has(row.client_id)) {
          skipped++
          return
        }
        const sub = row.subscription as webpush.PushSubscription
        try {
          await webpush.sendNotification(sub, JSON.stringify({ title, body, url }))
          sent++
        } catch (err: unknown) {
          const statusCode = err && typeof err === "object" && "statusCode" in err ? (err as { statusCode?: number }).statusCode : undefined
          if (statusCode === 410 || statusCode === 404) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("subscription->>endpoint", sub.endpoint)
          }
          failed++
        }
      })
    )

    return NextResponse.json({ sent, failed, skipped })
  } catch (err: unknown) {
    console.error("Push send error:", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 })
  }
}
