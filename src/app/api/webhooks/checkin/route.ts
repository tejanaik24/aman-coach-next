import { NextResponse } from "next/server"

const WEBHOOK_SECRET = process.env.AUTOMATION_SECRET

export async function POST(request: Request) {
  const incomingSecret =
    request.headers.get("x-webhook-secret") ??
    request.headers.get("x-automation-secret")

  if (!WEBHOOK_SECRET || incomingSecret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Unimplemented placeholder: no caller in this codebase or the n8n workflows
    // targets this route (check-in automation uses /api/automation/weekly-checkin
    // and /api/automation/mark-checkin-sent instead), so its intended behavior is
    // unknown. Body is parsed only to validate the request and then discarded.
    await request.json()
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }
}
