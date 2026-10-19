import { NextResponse } from "next/server"
import { automationSupabase as db, isAuthorizedAutomationRequest, todayInIndia } from "@/lib/automation"
import { fetchQuickManage } from "@/lib/quick-manage"
import { isCoachNotificationsEnabled } from "@/lib/automation-delivery"
import { sendWhatsAppTemplate, sendWhatsAppText, getWhatsAppConfigStatus } from "@/lib/whatsapp"
import { differenceInCalendarDays } from "date-fns"

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
  const todayStr = todayInIndia()
  const today = new Date(todayStr + "T00:00:00")

  // Parameter mappings:
  // {{1}} = "Aman"
  // {{2}} = open check-in follow-ups due today or within 2 days (tile followups, type checkin)
  // {{3}} = tile checkins (check-ins to review)
  // {{4}} = tile plans (plans to update)
  // {{5}} = tile payments (fees due)
  // {{6}} = renewals ending within 7 days (renewals this week)
  // {{7}} = birthdays today
  // {{8}} = tile enquiries (new enquiries)
  const checkinsDue = rows.filter((r) => {
    if (r.tile !== "followups" || r.action.kind !== "followup") return false
    if (r.action.type !== "checkin" || !r.action.dueDate) return false
    const diff = differenceInCalendarDays(new Date(r.action.dueDate + "T00:00:00"), today)
    return diff <= 2
  }).length

  const checkinsToReview = rows.filter((r) => r.tile === "checkins").length
  const plansToUpdate = rows.filter((r) => r.tile === "plans").length
  const feesDue = rows.filter((r) => r.tile === "payments").length

  const renewalsThisWeek = rows.filter((r) => {
    if (r.tile !== "renewals" || r.action.kind !== "renewal") return false
    if (!r.action.endDate) return false
    const diff = differenceInCalendarDays(new Date(r.action.endDate + "T00:00:00"), today)
    return diff >= 0 && diff <= 7
  }).length

  const birthdaysToday = rows.filter((r) => r.tile === "birthdays" && r.reason.includes("today")).length
  const newEnquiries = rows.filter((r) => r.tile === "enquiries").length

  const total = checkinsDue + checkinsToReview + plansToUpdate + feesDue + renewalsThisWeek + birthdaysToday + newEnquiries
  if (total === 0) {
    return NextResponse.json({ skipped: true, reason: "all_zero" })
  }

  const appUrl = "https://www.amankhuranafitness.com/dashboard"

  const components = [
    {
      type: "body",
      parameters: [
        { type: "text", text: "Aman" },
        { type: "text", text: String(checkinsDue) },
        { type: "text", text: String(checkinsToReview) },
        { type: "text", text: String(plansToUpdate) },
        { type: "text", text: String(feesDue) },
        { type: "text", text: String(renewalsThisWeek) },
        { type: "text", text: String(birthdaysToday) },
        { type: "text", text: String(newEnquiries) },
      ],
    },
  ]

  const counts = {
    checkinsDue,
    checkinsToReview,
    plansToUpdate,
    feesDue,
    renewalsThisWeek,
    birthdaysToday,
    newEnquiries,
  }

  const waConfig = getWhatsAppConfigStatus()
  if (!waConfig.configured || waConfig.dryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      counts,
    })
  }

  const tplRes = await sendWhatsAppTemplate(coachPhoneRaw, "coach_daily_summary", "en", components)
  if (tplRes.success && !tplRes.dryRun) {
    return NextResponse.json({ success: true, method: "template", counts, tplRes })
  }

  // Fallback to plain text if template is pending / unapproved
  const freeText = `Good morning Aman! Today at Aman Khurana Fitness:
- ${checkinsDue} check-ins due
- ${checkinsToReview} check-ins to review
- ${plansToUpdate} plans to update
- ${feesDue} fees due
- ${renewalsThisWeek} renewals this week
- ${birthdaysToday} birthdays
- ${newEnquiries} new enquiries

Open your app: ${appUrl}`

  const textRes = await sendWhatsAppText(coachPhoneRaw, freeText)
  return NextResponse.json({ success: textRes.success, method: "text_fallback", counts, textRes, tplError: tplRes.error })
}
