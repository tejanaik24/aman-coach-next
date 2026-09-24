import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getRazorpayInstance, verifyRazorpaySignature } from "@/lib/razorpay"
import { getOwnedPaymentTarget, markPaymentTargetPaid, type PaymentTargetKind } from "@/lib/server/payment-target"

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
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = body as {
      razorpayOrderId?: string
      razorpayPaymentId?: string
      razorpaySignature?: string
    }

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: "Missing required payment verification parameters" },
        { status: 400 }
      )
    }

    const isValid = verifyRazorpaySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    )

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid Razorpay payment signature" },
        { status: 400 }
      )
    }

    const razorpay = getRazorpayInstance()
    const order = await razorpay.orders.fetch(razorpayOrderId)
    const notes = order.notes as Record<string, string | undefined>
    const targetKind = notes.targetKind
    const targetId = notes.targetId

    if ((targetKind !== "invoice" && targetKind !== "fee") || !targetId || notes.userId !== user.id) {
      return NextResponse.json({ error: "Payment order does not belong to this account" }, { status: 403 })
    }

    const target = await getOwnedPaymentTarget(user.id, targetKind as PaymentTargetKind, targetId)
    if (!target) return NextResponse.json({ error: "Payment record not found" }, { status: 404 })
    if (order.amount !== Math.round(target.amount * 100)) {
      return NextResponse.json({ error: "Payment amount does not match the amount due" }, { status: 400 })
    }

    const updated = await markPaymentTargetPaid(target, razorpayOrderId, razorpayPaymentId)

    return NextResponse.json({
      success: true,
      message: updated ? "Payment verified successfully" : "Payment was already recorded",
      paymentId: razorpayPaymentId,
      orderId: razorpayOrderId,
    })
  } catch (error: unknown) {
    console.error("Razorpay verification error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify Razorpay payment" },
      { status: 500 }
    )
  }
}
