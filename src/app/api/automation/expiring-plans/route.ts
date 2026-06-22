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

  const { data: payments, error } = await supabase
    .from("payments")
    .select("client_id, created_at, plan")
    .eq("status", "completed")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const latestPerClient = new Map<string, { created_at: string; plan: string }>()
  for (const p of payments) {
    if (!latestPerClient.has(p.client_id)) {
      latestPerClient.set(p.client_id, p)
    }
  }

  const expiring: { client_id: string; display_name: string; email: string; phone: string; expiry_date: string; days_left: number }[] = []

  for (const [clientId, payment] of latestPerClient) {
    const created = new Date(payment.created_at)
    const expiry = new Date(created)
    expiry.setDate(expiry.getDate() + 30)
    const now = new Date()
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysLeft >= 0 && daysLeft <= 7) {
      const { data: user } = await supabase
        .from("users")
        .select("display_name, email, phone")
        .eq("id", clientId)
        .single()

      if (user) {
        expiring.push({
          client_id: clientId,
          display_name: user.display_name,
          email: user.email,
          phone: user.phone,
          expiry_date: expiry.toISOString().split("T")[0],
          days_left: daysLeft,
        })
      }
    }
  }

  return NextResponse.json(expiring)
}
