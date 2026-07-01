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
    await request.json()
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }
}
