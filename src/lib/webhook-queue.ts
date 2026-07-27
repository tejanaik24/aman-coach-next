import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const RETRY_DELAY_MS = 5 * 60 * 1000

export async function queueWebhook(eventType: string, payload: object) {
  const { data: row, error: insertError } = await supabase
    .from("pending_webhooks")
    .insert({ event_type: eventType, payload })
    .select("id, attempts")
    .single()

  if (insertError || !row) {
    console.error("Failed to queue webhook:", insertError)
    return
  }

  await attemptDelivery(row.id, eventType, payload, row.attempts)
}

async function attemptDelivery(id: string, eventType: string, payload: object, attempts: number) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  if (!webhookUrl) {
    console.error("N8N_WEBHOOK_URL environment variable is missing; leaving webhook pending")
    return
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, payload }),
    })

    if (!res.ok) {
      throw new Error(`Webhook responded with status ${res.status}`)
    }

    await supabase.from("pending_webhooks").update({ status: "sent" }).eq("id", id)
  } catch (err: any) {
    await supabase
      .from("pending_webhooks")
      .update({
        attempts: attempts + 1,
        last_error: err.message || "Unknown error",
        next_retry_at: new Date(Date.now() + RETRY_DELAY_MS).toISOString(),
      })
      .eq("id", id)
  }
}
