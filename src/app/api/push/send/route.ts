import { NextResponse } from "next/server"
import webpush from "web-push"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY || ""
  const vapidEmail = process.env.VAPID_EMAIL || "mailto:coach@akfitness.in"
  webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate)
  try {
    const authHeader = req.headers.get("authorization")
    const secretParam = new URL(req.url).searchParams.get("secret")
    const expectedSecret = process.env.AUTOMATION_SECRET
    if (secretParam !== expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { client_id, title, body, url } = await req.json()
    if (!title || !body) return NextResponse.json({ error: "Missing title or body" }, { status: 400 })

    let query = supabase.from("push_subscriptions").select("subscription")
    if (client_id) query = query.eq("client_id", client_id)

    const { data: rows, error: fetchErr } = await query
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    if (!rows || rows.length === 0) return NextResponse.json({ sent: 0, failed: 0 })

    let sent = 0
    let failed = 0

    await Promise.all(
      rows.map(async (row) => {
        const sub = row.subscription as webpush.PushSubscription
        try {
          await webpush.sendNotification(sub, JSON.stringify({ title, body, url }))
          sent++
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("subscription->>endpoint", sub.endpoint)
          }
          failed++
        }
      })
    )

    return NextResponse.json({ sent, failed })
  } catch (err: any) {
    console.error("Push send error:", err)
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}
