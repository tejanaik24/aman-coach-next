import { tasks } from "@trigger.dev/sdk"
import type { deliverAutomationEvent } from "@/trigger/deliver-automation-event"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "")

export async function queueWebhook(eventType: string, payload: Record<string, unknown>): Promise<void> {
  const { data: row, error: insertError } = await supabase
    .from("pending_webhooks")
    .insert({ event_type: eventType, payload })
    .select("id")
    .single()

  if (insertError || !row) throw new Error(`Failed to queue automation event: ${insertError?.message ?? "unknown error"}`)
  await submitDelivery(row.id, eventType, payload)
}

export async function submitDelivery(id: string, eventType: string, payload: Record<string, unknown>): Promise<void> {
  if (!process.env.TRIGGER_SECRET_KEY) {
    throw new Error("TRIGGER_SECRET_KEY is missing; automation event remains queued for safe retry")
  }
  await tasks.trigger<typeof deliverAutomationEvent>("deliver-automation-event", { deliveryId: id, eventType, payload }, { idempotencyKey: `automation-delivery:${id}` })
}
