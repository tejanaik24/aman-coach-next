import { NextResponse } from "next/server"
import { isAuthorizedAutomationRequest } from "@/lib/automation"
import { deliverAutomationEvent } from "@/lib/automation-delivery"

const value = (input: unknown) => typeof input === "string" ? input.trim() : ""

export async function POST(request: Request) {
  if (!isAuthorizedAutomationRequest(request)) return NextResponse.json({ error: "Unauthorized automation request" }, { status: 401 })
  const body = await request.json().catch(() => null)
  const deliveryId = value(body?.deliveryId)
  const eventType = value(body?.eventType)
  const payload = body?.payload as Record<string, unknown> | undefined
  if (!deliveryId || !payload) return NextResponse.json({ error: "Invalid automation event" }, { status: 400 })

  try {
    const result = await deliverAutomationEvent(deliveryId, eventType, payload)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Automation delivery failed" }, { status: 502 })
  }
}
