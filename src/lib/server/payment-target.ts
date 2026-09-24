import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export type PaymentTargetKind = "invoice" | "fee"

export type PaymentTarget = {
  id: string
  kind: PaymentTargetKind
  clientId: string
  amount: number
  status: "pending" | "paid" | "overdue"
}

type TargetRow = {
  id: string
  client_id: string
  total_amount?: number
  amount?: number
  status: PaymentTarget["status"]
}

function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase service credentials are not configured")
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function getOwnedPaymentTarget(
  userId: string,
  kind: PaymentTargetKind,
  targetId: string
): Promise<PaymentTarget | null> {
  const supabase = serviceClient()
  const table = kind === "invoice" ? "invoices" : "fees"
  const { data, error } = await supabase
    .from(table)
    .select("id, client_id, total_amount, amount, status")
    .eq("id", targetId)
    .maybeSingle()

  if (error) throw new Error(`Unable to load payment record: ${error.message}`)
  if (!data) return null

  const row = data as unknown as TargetRow
  const { data: access, error: accessError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", row.client_id)
    .or(`user_id.eq.${userId},coach_id.eq.${userId}`)
    .maybeSingle()
  if (accessError) throw new Error(`Unable to verify payment access: ${accessError.message}`)
  if (!access) return null

  const amount = Number(kind === "invoice" ? row.total_amount : row.amount)
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Payment record has an invalid amount")

  return { id: row.id, kind, clientId: row.client_id, amount, status: row.status }
}

export async function getPaymentTarget(
  kind: PaymentTargetKind,
  targetId: string
): Promise<PaymentTarget | null> {
  const supabase = serviceClient()
  const table = kind === "invoice" ? "invoices" : "fees"
  const { data, error } = await supabase
    .from(table)
    .select("id, client_id, total_amount, amount, status")
    .eq("id", targetId)
    .maybeSingle()

  if (error) throw new Error(`Unable to load payment record: ${error.message}`)
  if (!data) return null

  const row = data as unknown as TargetRow
  const amount = Number(kind === "invoice" ? row.total_amount : row.amount)
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Payment record has an invalid amount")

  return { id: row.id, kind, clientId: row.client_id, amount, status: row.status }
}

export async function markPaymentTargetPaid(
  target: PaymentTarget,
  orderId: string,
  paymentId: string
): Promise<boolean> {
  const supabase = serviceClient()
  const paidAt = new Date().toISOString()

  if (target.kind === "invoice") {
    const { data, error } = await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: paidAt })
      .eq("id", target.id)
      .neq("status", "paid")
      .select("id")
      .maybeSingle()
    if (error) throw new Error(`Unable to update invoice: ${error.message}`)
    if (!data) return false

    const { error: paymentError } = await supabase.from("payments").insert({
      invoice_id: target.id,
      client_id: target.clientId,
      amount: target.amount,
      payment_method: "Razorpay",
      transaction_ref: paymentId,
    })
    if (paymentError) throw new Error(`Unable to record payment: ${paymentError.message}`)
    return true
  }

  const { data, error } = await supabase
    .from("fees")
    .update({
      status: "paid",
      paid_date: paidAt.slice(0, 10),
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
    })
    .eq("id", target.id)
    .neq("status", "paid")
    .select("id")
    .maybeSingle()
  if (error) throw new Error(`Unable to update fee: ${error.message}`)
  return Boolean(data)
}
