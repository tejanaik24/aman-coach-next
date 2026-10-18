import { NextResponse } from "next/server"
import { automationSupabase as db, isAuthorizedAutomationRequest } from "@/lib/automation"
import { fetchQuickManage } from "@/lib/quick-manage"
import { isCoachNotificationsEnabled } from "@/lib/automation-delivery"
import { sendWhatsAppTemplate, sendWhatsAppText, getWhatsAppConfigStatus } from "@/lib/whatsapp"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  if (!isAuthorizedAutomationRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const isTest = url.searchParams.get("test") === "1"
  const coachPhoneRaw = isTest ? "918886720908" : (process.env.AMAN_WHATSAPP || process.env.COACH_WHATSAPP_NUMBER)
  if (!coachPhoneRaw) {
    return NextResponse.json({ skipped: true, reason: "no_coach_phone" })
  }

  // Find Aman's coach ID
  const { data: coachProfile } = await db
    .from("profiles")
    .select("id, name")
    .eq("role", "coach")
    .limit(1)
    .maybeSingle()

  if (!coachProfile?.id) {
    return NextResponse.json({ skipped: true, reason: "no_coach_found" })
  }

  const coachId = coachProfile.id

  // Respect isCoachNotificationsEnabled
  const enabled = await isCoachNotificationsEnabled({ coachId, coachPhone: coachPhoneRaw })
  if (!enabled) {
    return NextResponse.json({ skipped: true, reason: "coach_notifications_disabled" })
  }

  const rows = await fetchQuickManage(db, coachId)

  const checkinsDue = rows.filter((r) => r.tile === "checkins").length
  const plansToUpdate = rows.filter((r) => r.tile === "plans").length
  const feesDue = rows.filter((r) => r.tile === "payments").length
  const renewals = rows.filter((r) => r.tile === "renewals").length
  const birthdays = rows.filter((r) => r.tile === "birthdays" && r.reason.includes("today")).length
  const enquiries = rows.filter((r) => r.tile === "enquiries").length

  const total = checkinsDue + plansToUpdate + feesDue + renewals + birthdays + enquiries
  if (total === 0) {
    return NextResponse.json({ skipped: true, reason: "all_zero" })
  }

  const appUrl = "https://www.amankhuranafitness.com/dashboard"

  // Attempt Meta Template coach_daily_summary
  // Parameters:
  // 1: Coach Name
  // 2: Check-ins due count
  // 3: Plans to update count
  // 4: Fees due count
  // 5: Renewals count
  // 6: Birthdays count
  // 7: Enquiries count
  // 8: Dashboard URL
  const components = [
    {
      type: "body",
      parameters: [
        { type: "text", text: coachProfile.name || "Aman" },
        { type: "text", text: String(checkinsDue) },
        { type: "text", text: String(plansToUpdate) },
        { type: "text", text: String(feesDue) },
        { type: "text", text: String(renewals) },
        { type: "text", text: String(birthdays) },
        { type: "text", text: String(enquiries) },
        { type: "text", text: appUrl },
      ],
    },
  ]

  const waConfig = getWhatsAppConfigStatus()
  if (!waConfig.configured || waConfig.dryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      counts: { checkinsDue, plansToUpdate, feesDue, renewals, birthdays, enquiries },
    })
  }

  const tplRes = await sendWhatsAppTemplate(coachPhoneRaw, "coach_daily_summary", "en", components)
  if (tplRes.success && !tplRes.dryRun) {
    return NextResponse.json({ success: true, method: "template", tplRes })
  }

  // Fallback to plain text if template is pending / unapproved
  const freeText = `Good morning Coach Aman! ??\nHere is your daily summary for today:\n\n� Check-ins to review: ${checkinsDue}\n� Plans to update: ${plansToUpdate}\n� Pending fees: ${feesDue}\n� Upcoming renewals: ${renewals}\n� Birthdays today: ${birthdays}\n� New enquiries: ${enquiries}\n\nOpen Quick Manage: ${appUrl}\n� Team AKF`

  const textRes = await sendWhatsAppText(coachPhoneRaw, freeText)
  return NextResponse.json({ success: textRes.success, method: "text_fallback", textRes })
}
