import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { queueWebhook } from "@/lib/webhook-queue"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => null)
  const feedback = typeof body?.feedback === "string" ? body.feedback.trim() : ""
  if (!feedback) return NextResponse.json({ error: "Feedback is required" }, { status: 400 })

  const { data: checkin, error: checkinError } = await supabase
    .from("checkins")
    .select("id, client_id, clients!inner(coach_id, user_id)")
    .eq("id", id)
    .single()
  if (checkinError || !(checkin as any)?.clients || (checkin as any).clients.coach_id !== user.id) {
    return NextResponse.json({ error: "Check-in not found" }, { status: 404 })
  }

  const clientUserId = (checkin as any).clients.user_id as string
  const { data: profile } = await supabase.from("profiles").select("name, phone").eq("id", clientUserId).maybeSingle()
  if (!profile?.phone) {
    return NextResponse.json({ error: "Client phone number is missing; feedback was not sent" }, { status: 409 })
  }

  const { error: updateError } = await supabase
    .from("checkins")
    .update({ coach_feedback: feedback, reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq("id", id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: authData } = await admin.auth.admin.getUserById(clientUserId)

  await queueWebhook("coach_feedback", {
    clientName: profile.name || "Client",
    phone: profile.phone.replace(/\D/g, ""),
    email: authData.user?.email || "",
    feedback,
  }).catch((error) => console.error("Coach feedback queued for retry:", error))
  return NextResponse.json({ success: true })
}
