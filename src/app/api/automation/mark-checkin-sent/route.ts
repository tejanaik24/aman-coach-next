import { NextResponse } from "next/server"
import { automationSupabase, isAuthorizedAutomationRequest } from "@/lib/automation"

export async function POST(request: Request) {
  if (!isAuthorizedAutomationRequest(request)) {
    return NextResponse.json({ error: "Unauthorized automation request" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const clientId = typeof body?.client_id === "string" ? body.client_id : null
  if (!clientId) return NextResponse.json({ error: "Missing client_id" }, { status: 400 })

  const { error } = await automationSupabase
    .from("reminder_log")
    .insert({ client_id: clientId, reminder_type: "checkin" })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, clientId })
}
