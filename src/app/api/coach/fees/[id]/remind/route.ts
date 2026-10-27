import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { SITE_URL } from "@/lib/site"
import { amountDue } from "@/lib/fee-math"
import { feeReminderText, sendFeeReminder, type FeeReminderStage } from "@/lib/whatsapp"

// Coach taps "Remind" on a bill: the fee reminder goes from the business WhatsApp number
// (approved fee_reminder_* templates, bill link inside), not from Aman's own number (Aman 26 Oct).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (me?.role !== "coach") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data: fee } = await supabase
    .from("fees")
    .select("id, client_id, amount, amount_paid, due_date, status, token")
    .eq("id", id)
    .maybeSingle()
  if (!fee) return NextResponse.json({ error: "Bill not found" }, { status: 404 })
  if (fee.status === "paid" || amountDue(fee) <= 0) return NextResponse.json({ error: "This bill is already paid" }, { status: 400 })

  // Same ownership rule as the login link: only this coach's own clients
  const { data: client } = await supabase
    .from("clients")
    .select("user_id, package_name")
    .eq("id", fee.client_id)
    .eq("coach_id", user.id)
    .maybeSingle()
  if (!client?.user_id) return NextResponse.json({ error: "Client not found" }, { status: 404 })

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: profile } = await admin.from("profiles").select("name, phone").eq("id", client.user_id).maybeSingle()
  const phone = profile?.phone?.replace(/\D/g, "") ?? ""
  if (!phone) return NextResponse.json({ error: "Client has no phone number" }, { status: 400 })

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
  const stage: FeeReminderStage = fee.due_date < today ? "late" : fee.due_date === today ? "due" : "before"
  const d = fee.due_date
  const dueText = `${d.slice(8, 10)}-${d.slice(5, 7)}-${d.slice(0, 4)}`
  const link = fee.token ? `${SITE_URL}/bill/${fee.token}` : `${SITE_URL}/payments`

  // ?preview=1: show Aman the exact message first, send nothing (Aman 26 Oct: "what the client will see")
  if (new URL(req.url).searchParams.get("preview")) {
    return NextResponse.json({ phone, text: feeReminderText(profile?.name ?? "", client.package_name || "", dueText, stage, link) })
  }

  const res = await sendFeeReminder(phone, profile?.name ?? "", client.package_name || "", dueText, stage, link)
  if (!res.success || res.dryRun) return NextResponse.json({ error: "WhatsApp did not send. Try again." }, { status: 502 })

  await admin.from("reminder_log").insert({ client_id: fee.client_id, reminder_type: `fee_${fee.id}_manual|wa:ok` })
  return NextResponse.json({ ok: true })
}
