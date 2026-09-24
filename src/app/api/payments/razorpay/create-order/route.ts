import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getRazorpayInstance, getRazorpayKeyId } from "@/lib/razorpay"
import { getOwnedPaymentTarget, type PaymentTargetKind } from "@/lib/server/payment-target"

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore cookie mutations in server component / api route read
            }
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { invoiceId, feeId, packageName } = body as {
      invoiceId?: string
      feeId?: string
      packageName?: string
    }

    if ((invoiceId && feeId) || (!invoiceId && !feeId)) {
      return NextResponse.json({ error: "Choose exactly one invoice or fee to pay" }, { status: 400 })
    }

    const targetKind: PaymentTargetKind = invoiceId ? "invoice" : "fee"
    const targetId = invoiceId || feeId || ""
    const target = await getOwnedPaymentTarget(user.id, targetKind, targetId)
    if (!target) return NextResponse.json({ error: "Payment record not found" }, { status: 404 })
    if (target.status === "paid") return NextResponse.json({ error: "This payment is already complete" }, { status: 409 })

    // Convert amount in INR to paise (1 INR = 100 paise)
    const amountInPaise = Math.round(target.amount * 100)

    const razorpay = getRazorpayInstance()
    const receipt = `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

    const orderOptions = {
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes: {
        userId: user.id,
        targetKind,
        targetId: target.id,
        packageName: packageName || "",
      },
    }

    const order = await razorpay.orders.create(orderOptions)

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: getRazorpayKeyId(),
    })
  } catch (error: unknown) {
    console.error("Razorpay order creation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create Razorpay order" },
      { status: 500 }
    )
  }
}
