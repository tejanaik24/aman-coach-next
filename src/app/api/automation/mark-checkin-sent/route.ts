import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  if (request.headers.get("x-automation-secret") !== process.env.AUTOMATION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.json()
  const { client_id } = body

  if (!client_id) {
    return NextResponse.json({ error: "client_id required" }, { status: 400 })
  }

  const { error } = await supabase
    .from("users")
    .update({ last_checkin_reminder: new Date().toISOString() })
    .eq("id", client_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
