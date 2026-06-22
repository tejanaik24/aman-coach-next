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
    .select("client_id, amount, created_at, id")
    .eq("status", "pending")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const now = new Date()
  const result: { client_id: string; display_name: string; email: string; phone: string; amount: number; days_overdue: number; payment_id: string }[] = []

  for (const p of payments) {
    const created = new Date(p.created_at)
    const daysOverdue = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))

    if (daysOverdue === 3 || daysOverdue === 7 || daysOverdue === 10) {
      const { data: user } = await supabase
        .from("users")
        .select("display_name, email, phone")
        .eq("id", p.client_id)
        .single()

      if (user) {
        result.push({
          client_id: p.client_id,
          display_name: user.display_name,
          email: user.email,
          phone: user.phone,
          amount: p.amount,
          days_overdue: daysOverdue,
          payment_id: p.id,
        })
      }
    }
  }

  return NextResponse.json(result)
}
