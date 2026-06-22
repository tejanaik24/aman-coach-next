import { NextResponse } from "next/server"
import {
  sendWelcomeEmail,
  sendInvoiceEmail,
  sendPaymentReminderEmail,
  sendPlanExpiryEmail,
} from "@/lib/email"

interface EmailPayload {
  type: "welcome" | "invoice" | "payment_reminder" | "plan_expiry"
  to: string
  name: string
  loginUrl?: string
  invoiceUrl?: string
  amount?: number
  month?: string
  dueDate?: string
  dayNumber?: number
  expiryDate?: string
  daysLeft?: number
}

export async function POST(request: Request) {
  if (request.headers.get("x-automation-secret") !== process.env.AUTOMATION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body: EmailPayload = await request.json()

  let result
  switch (body.type) {
    case "welcome":
      result = await sendWelcomeEmail(body.to, body.name, body.loginUrl || "https://aman-coach-next.vercel.app/auth/login")
      break
    case "invoice":
      result = await sendInvoiceEmail(body.to, body.name, body.invoiceUrl || "", body.amount || 0, body.month || "")
      break
    case "payment_reminder":
      result = await sendPaymentReminderEmail(body.to, body.name, body.amount || 0, body.dueDate || "", body.dayNumber || 1)
      break
    case "plan_expiry":
      result = await sendPlanExpiryEmail(body.to, body.name, body.expiryDate || "", body.daysLeft || 0)
      break
    default:
      return NextResponse.json({ error: "Invalid email type" }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    messageId: result?.data?.id || null,
  })
}
