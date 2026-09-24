import { NextResponse } from "next/server"
import { verifyWebhookSignature } from "@/lib/razorpay"
import { getPaymentTarget, markPaymentTargetPaid, type PaymentTargetKind } from "@/lib/server/payment-target"

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get("x-razorpay-signature") || ""

    if (!signature) {
      return NextResponse.json({ error: "Missing signature header" }, { status: 400 })
    }

    const isValid = verifyWebhookSignature(rawBody, signature)
    if (!isValid) {
      console.warn("Invalid Razorpay webhook signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const event = JSON.parse(rawBody) as {
      event?: string
      payload?: { payment?: { entity?: PaymentEntity }; order?: { entity?: PaymentEntity } }
    }
    const eventType = event.event

    if (eventType === "payment.captured" || eventType === "order.paid") {
      const entity = event.payload?.payment?.entity || event.payload?.order?.entity
      const targetKind = entity?.notes?.targetKind
      const targetId = entity?.notes?.targetId
      const orderId = entity?.order_id || entity?.id
      const paymentId = entity?.id

      if ((targetKind === "invoice" || targetKind === "fee") && targetId && orderId && paymentId) {
        const target = await getPaymentTarget(targetKind as PaymentTargetKind, targetId)
        if (!target) return NextResponse.json({ error: "Payment record not found" }, { status: 404 })
        if (entity?.amount !== Math.round(target.amount * 100)) {
          return NextResponse.json({ error: "Payment amount does not match the amount due" }, { status: 400 })
        }
        await markPaymentTargetPaid(target, orderId, paymentId)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: unknown) {
    console.error("Razorpay webhook error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed" },
      { status: 500 }
    )
  }
}

type PaymentEntity = {
  id?: string
  order_id?: string
  amount?: number
  notes?: { targetKind?: string; targetId?: string }
}
