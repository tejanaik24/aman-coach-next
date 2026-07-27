import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { withRetry } from "@/lib/db-retry"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const RETRY_DELAY_MS = 5 * 60 * 1000

export async function GET(req: Request) {
  return handleRetry(req)
}

export async function POST(req: Request) {
  return handleRetry(req)
}

async function handleRetry(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")
    const secretParam = new URL(req.url).searchParams.get("secret")
    const expectedSecret = process.env.AUTOMATION_SECRET

    if (!expectedSecret) {
      throw new Error("AUTOMATION_SECRET environment variable is missing")
    }

    if (secretParam !== expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized automation request" }, { status: 401 })
    }

    const webhookUrl = process.env.N8N_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json({ error: "N8N_WEBHOOK_URL environment variable is missing" }, { status: 500 })
    }

    const { data: rows, error: fetchError } = await withRetry(() =>
      supabase
        .from("pending_webhooks")
        .select("id, event_type, payload, attempts")
        .eq("status", "pending")
        .lte("next_retry_at", new Date().toISOString())
    )

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const results = []

    for (const row of rows || []) {
      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventType: row.event_type, payload: row.payload }),
        })

        if (!res.ok) {
          throw new Error(`Webhook responded with status ${res.status}`)
        }

        await withRetry(() => supabase.from("pending_webhooks").update({ status: "sent" }).eq("id", row.id))
        results.push({ id: row.id, status: "sent" })
      } catch (err: any) {
        await withRetry(() =>
          supabase
            .from("pending_webhooks")
            .update({
              attempts: row.attempts + 1,
              last_error: err.message || "Unknown error",
              next_retry_at: new Date(Date.now() + RETRY_DELAY_MS).toISOString(),
            })
            .eq("id", row.id)
        )
        results.push({ id: row.id, status: "retry_scheduled", error: err.message })
      }
    }

    return NextResponse.json({ success: true, processed: results.length, details: results })
  } catch (err: any) {
    console.error("Webhook retry handler error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
