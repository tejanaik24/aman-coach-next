import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("role", "client")
    .eq("status", "active")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const now = new Date().toISOString()
  for (const client of data || []) {
    await supabase.from("users").update({ last_checkin_reminder: now }).eq("id", client.id)
  }

  return NextResponse.json({ success: true, count: data?.length || 0 })
}
