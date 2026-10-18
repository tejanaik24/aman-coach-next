import { NextRequest, NextResponse } from "next/server"
import { automationSupabase } from "@/lib/automation"
import { finalAmount, paidSoFar, amountDue } from "@/lib/fee-math"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    if (!token || token.length < 8) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 })
    }

    const { data: fee, error: feeErr } = await automationSupabase
      .from("fees")
      .select("*, clients(id, user_id, package_name, start_date, end_date, member_number, profiles!user_id(name, phone))")
      .eq("token", token)
      .maybeSingle()

    if (feeErr || !fee) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 })
    }

    const c = fee.clients as {
      id?: string
      user_id?: string
      package_name?: string
      start_date?: string
      end_date?: string
      member_number?: number
      profiles?: { name?: string; phone?: string } | { name?: string; phone?: string }[]
    } | null

    const p = Array.isArray(c?.profiles) ? c?.profiles[0] : c?.profiles
    const clientName = p?.name ?? "Client"
    const clientPhone = p?.phone ?? null

    const discount = Number(fee.discount ?? 0)
    const otherCharges = Number(fee.other_charges ?? 0)
    const rewardPointsRedeemed = Number(fee.reward_points_redeemed ?? 0)
    const totalAmount = finalAmount(fee)
    const packageFee =
      fee.package_fee !== null && fee.package_fee !== undefined && Number(fee.package_fee) > 0
        ? Number(fee.package_fee)
        : totalAmount + discount - otherCharges + rewardPointsRedeemed

    const amountPaid = paidSoFar(fee)
    const balanceDue = fee.status === "paid" ? 0 : amountDue(fee)
    const isPaid = fee.status === "paid" || balanceDue <= 0

    const invNum =
      fee.invoice_number ||
      (c?.member_number ? String(c.member_number).padStart(5, "0") : `INV-${fee.id.slice(0, 6).toUpperCase()}`)

    const emiSuffix = fee.emi_no && fee.emi_total ? ` (EMI ${fee.emi_no} of ${fee.emi_total})` : ""
    const packageName = (fee.package_name || c?.package_name || "Personal Coaching") + emiSuffix

    return NextResponse.json({
      bill: {
        id: fee.id,
        invoiceNumber: invNum,
        clientName,
        clientPhone,
        packageName,
        startDate: c?.start_date ?? null,
        endDate: c?.end_date ?? null,
        packageFee,
        discount,
        otherCharges,
        totalAmount,
        amountPaid,
        balanceDue,
        dueDate: fee.due_date,
        paidDate: fee.paid_date,
        status: isPaid ? "paid" : fee.status,
        emiNo: fee.emi_no,
        emiTotal: fee.emi_total,
        notes: fee.notes,
        createdAt: fee.created_at,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}