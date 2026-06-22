import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendInvoiceEmail } from "@/lib/email"

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.json()
  const { client_id, amount, method, plan, month } = body

  if (!client_id || !amount) {
    return NextResponse.json({ error: "client_id and amount required" }, { status: 400 })
  }

  const { data: client } = await supabase
    .from("users")
    .select("coach_id, display_name, email")
    .eq("id", client_id)
    .single()

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }

  const invoiceId = `INV-${Date.now()}`

  const { error: insertError } = await supabase.from("payments").insert({
    client_id,
    coach_id: client.coach_id,
    amount,
    method: method || "upi",
    plan: plan || null,
    month: month || null,
    status: "completed",
    invoice_id: invoiceId,
    date: new Date().toISOString(),
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const invoiceUrl = `https://aman-coach-next.vercel.app/client/payments?invoice=${invoiceId}`

  try {
    await sendInvoiceEmail(client.email, client.display_name, invoiceUrl, amount, month || "current")
  } catch {
    /* email is best-effort */
  }

  return NextResponse.json({ success: true, invoiceUrl })
}
