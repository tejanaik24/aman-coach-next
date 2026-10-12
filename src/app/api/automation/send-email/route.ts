import { NextResponse } from "next/server"
import {
  sendPaymentReminderEmail,
  sendPlanExpiryEmail,
  sendWelcomeEmail,
} from "@/lib/email"
import { isAuthorizedAutomationRequest } from "@/lib/automation"
import { SITE_URL } from "@/lib/site"

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
    let res
    switch (body?.type) {
      case "welcome":
        res = await sendWelcomeEmail(to, name, typeof body.loginUrl === "string" ? body.loginUrl : `${SITE_URL}/auth/login`)
        break
      case "payment_reminder":
        res = await sendPaymentReminderEmail(to, name, Number(body.amount), String(body.dueDate || ""), Number(body.dayNumber))
        break
      case "plan_expiry":
        res = await sendPlanExpiryEmail(to, name, String(body.expiryDate || ""), Number(body.daysLeft))
        break
      default:
        return NextResponse.json({ error: "Unsupported email type" }, { status: 400 })
    }
    if (!res.success || res.dryRun) {
      return NextResponse.json(
        {
          success: false,
          dryRun: Boolean(res.dryRun),
          skipped: Boolean(res.skipped),
          error: res.error || "Email delivery failed",
        },
        { status: res.dryRun || res.skipped ? 200 : 502 }
      )
    }
  } catch (error) {
    console.error("Automation email failed", error)
    return NextResponse.json({ error: "Email delivery failed" }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
