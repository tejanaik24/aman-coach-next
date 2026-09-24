import { NextResponse } from "next/server"
import { automationSupabase, isAuthorizedAutomationRequest } from "@/lib/automation"
import { submitDelivery } from "@/lib/webhook-queue"

export async function GET(req: Request) {
  return handleRetry(req)
}

export async function POST(req: Request) {
  return handleRetry(req)
}

async function handleRetry(req: Request) {
  try {
    if (!isAuthorizedAutomationRequest(req)) {
      return NextResponse.json({ error: "Unauthorized automation request" }, { status: 401 })
    }

    const { data: rows, error: fetchError } = await
      automationSupabase
        .from("pending_webhooks")
        .select("id, event_type, payload")
        .eq("status", "pending")
        .lte("next_retry_at", new Date().toISOString())

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const results = []

    for (const row of rows || []) {
      try {
        await submitDelivery(row.id, row.event_type, row.payload)
        results.push({ id: row.id, status: "submitted" })
      } catch (err: any) {
        results.push({ id: row.id, status: "delivery_failed", error: err.message })
      }
    }

    return NextResponse.json({ success: true, processed: results.length, details: results })
  } catch (err: any) {
    console.error("Webhook retry handler error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
