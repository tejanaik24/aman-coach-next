import { NextResponse } from "next/server"
import { automationSupabase, isAuthorizedAutomationRequest } from "@/lib/automation"

export async function POST(request: Request) {
  if (!isAuthorizedAutomationRequest(request)) {
    return NextResponse.json({ error: "Unauthorized automation request" }, { status: 401 })
  }
  const body = await request.json().catch(() => null)
  const id = typeof body?.delivery_id === "string" ? body.delivery_id : ""
  if (!id) return NextResponse.json({ error: "Missing delivery_id" }, { status: 400 })
  const { data, error } = await automationSupabase
    .from("pending_webhooks")
    .update({ status: "sent", last_error: null })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ error: "Unknown or already acknowledged delivery" }, { status: 404 })
  return NextResponse.json({ success: true })
}
