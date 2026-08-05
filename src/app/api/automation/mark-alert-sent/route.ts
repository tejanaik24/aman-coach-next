import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { withRetry } from "@/lib/db-retry"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(req: Request) {
  return handleMarkSent(req)
}

export async function POST(req: Request) {
  return handleMarkSent(req)
}

async function handleMarkSent(req: Request) {
  const authHeader = req.headers.get("authorization")
  const secretHeader =
    req.headers.get("x-automation-secret") ?? req.headers.get("x-webhook-secret")
  const secretParam = new URL(req.url).searchParams.get("secret")
  const expectedSecret = process.env.AUTOMATION_SECRET

  if (!expectedSecret) {
    return NextResponse.json({ error: "AUTOMATION_SECRET environment variable is missing" }, { status: 500 })
  }

  if (secretHeader !== expectedSecret && secretParam !== expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized automation request" }, { status: 401 })
  }

  let id: string | null = null
  try {
    const body = await req.json()
    id = typeof body?.id === "string" ? body.id : null
  } catch {
    id = null
  }

  if (!id) {
    return NextResponse.json({ error: "Missing submission id" }, { status: 400 })
  }

  const { error: updateError } = await withRetry(() =>
    supabase
      .from("form_submissions")
      .update({ coach_alert_sent_at: new Date().toISOString() })
      .eq("id", id)
  )

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, id })
}
