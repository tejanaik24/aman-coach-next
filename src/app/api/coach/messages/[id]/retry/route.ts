import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { adminDb, forwardToCoach, matchClient, type InboundRow } from "@/lib/server/whatsapp-inbox"

// Coach taps "Send again" on a message whose forward failed.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (me?.role !== "coach") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const db = adminDb()
  const { data } = await db.from("whatsapp_inbound").select("*").eq("id", id).eq("coach_id", user.id).maybeSingle()
  if (!data) return NextResponse.json({ error: "Message not found" }, { status: 404 })
  const row = data as InboundRow

  const { name } = await matchClient(db, user.id, row.from_phone)
  await forwardToCoach(db, row, name)

  const { data: after } = await db
    .from("whatsapp_inbound")
    .select("forward_status, forward_error")
    .eq("id", id)
    .maybeSingle()
  return NextResponse.json({ success: true, status: after?.forward_status ?? "pending", error: after?.forward_error ?? null })
}
