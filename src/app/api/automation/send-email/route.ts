import { NextResponse } from "next/server"
import {
  sendPaymentReminderEmail,
  sendPlanExpiryEmail,
  sendWelcomeEmail,
} from "@/lib/email"
import { isAuthorizedAutomationRequest } from "@/lib/automation"

export async function POST(request: Request) {
  if (!isAuthorizedAutomationRequest(request)) {
    return NextResponse.json({ error: "Unauthorized automation request" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (body?.type === "noop") return NextResponse.json({ success: true })
  const to = typeof body?.to === "string" ? body.to.trim() : ""
  const name = typeof body?.name === "string" ? body.name.trim() : "Client"
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "Invalid email recipient" }, { status: 400 })
  }

  try {
    switch (body?.type) {
      case "welcome":
        await sendWelcomeEmail(to, name, typeof body.loginUrl === "string" ? body.loginUrl : "https://aman-coach-next.vercel.app/auth/login")
        break
      case "payment_reminder":
        await sendPaymentReminderEmail(to, name, Number(body.amount), String(body.dueDate || ""), Number(body.dayNumber))
        break
      case "plan_expiry":
        await sendPlanExpiryEmail(to, name, String(body.expiryDate || ""), Number(body.daysLeft))
        break
      default:
        return NextResponse.json({ error: "Unsupported email type" }, { status: 400 })
    }
  } catch (error) {
    console.error("Automation email failed", error)
    return NextResponse.json({ error: "Email delivery failed" }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
