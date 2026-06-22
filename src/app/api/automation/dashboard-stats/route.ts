import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { count: activeClients } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("role", "client")
    .eq("status", "active")

  const { data: payments } = await supabase
    .from("payments")
    .select("client_id, created_at")
    .eq("status", "completed")
    .order("created_at", { ascending: false })

  let expiringCount = 0
  const latestPerClient = new Map<string, string>()
  for (const p of payments || []) {
    if (!latestPerClient.has(p.client_id)) {
      latestPerClient.set(p.client_id, p.created_at)
    }
  }
  for (const created of latestPerClient.values()) {
    const expiry = new Date(created)
    expiry.setDate(expiry.getDate() + 30)
    const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysLeft >= 0 && daysLeft <= 7) expiringCount++
  }

  return NextResponse.json({
    activeClients: activeClients || 0,
    expiringCount,
    today: new Date().toISOString().split("T")[0],
  })
}
