import webpush from "web-push"
import { createClient } from "@supabase/supabase-js"

/**
 * Phone alert to the coach (Aman). Coach phones are push_subscriptions rows with client_id NULL,
 * added from the "Alerts on this phone" card on Quick Manage. Never throws: an alert must not break a form submit.
 */
export async function sendCoachPush(title: string, body: string, url = "/dashboard") {
  try {
    const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const priv = process.env.VAPID_PRIVATE_KEY
    if (!pub || !priv) return
    webpush.setVapidDetails(process.env.VAPID_EMAIL || "mailto:coach@akfitness.in", pub, priv)

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "")
    const { data: rows } = await sb.from("push_subscriptions").select("id, subscription").is("client_id", null)
    await Promise.all(
      (rows ?? []).map(async (r) => {
        try {
          await webpush.sendNotification(r.subscription as webpush.PushSubscription, JSON.stringify({ title, body, url }))
        } catch (err) {
          const code = (err as { statusCode?: number })?.statusCode
          if (code === 404 || code === 410) await sb.from("push_subscriptions").delete().eq("id", r.id)
          else console.error("Coach push failed:", err)
        }
      }),
    )
  } catch (err) {
    console.error("Coach push error:", err)
  }
}
