import { NextResponse } from "next/server"
import { automationSupabase, isAuthorizedAutomationRequest } from "@/lib/automation"

const EVENT_PATTERN = /^(payment_reminder_(3|7|10)|plan_expiry_(0|3|7))$/

export async function POST(request: Request) {
  if (!isAuthorizedAutomationRequest(request)) {
    return NextResponse.json({ error: "Unauthorized automation request" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const entityId = typeof body?.entity_id === "string" ? body.entity_id : ""
  const clientId = typeof body?.client_id === "string" ? body.client_id : null
  const entityType = body?.entity_type === "fee" || body?.entity_type === "plan" ? body.entity_type : ""
  const eventType = typeof body?.event_type === "string" ? body.event_type : ""
  if (!entityId || !entityType || !EVENT_PATTERN.test(eventType)) {
    return NextResponse.json({ error: "Invalid reminder delivery payload" }, { status: 400 })
  }

  const { error } = await automationSupabase
    .from("automation_deliveries")
    .upsert({ client_id: clientId, entity_type: entityType, entity_id: entityId, event_type: eventType }, { onConflict: "entity_type,entity_id,event_type" })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
