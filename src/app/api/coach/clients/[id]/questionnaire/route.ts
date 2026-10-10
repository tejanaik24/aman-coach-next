import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"

// Coach fills the joining questionnaire for one of their clients (same form as the public one).
// Saved on the client's profile (client_id + user_id), so there is nothing to attach afterwards.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Please log in as coach first" }, { status: 401 })

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (me?.role !== "coach") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // RLS: a coach can only read their own clients
  const { data: client } = await supabase.from("clients").select("id, user_id").eq("id", id).maybeSingle()
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const name = String(body.name || "").trim()
  const tel = String(body.tel || "").trim()
  if (!name || !tel) return NextResponse.json({ error: "Name and phone are required" }, { status: 400 })

  const { error } = await supabase.from("form_submissions").insert({
    user_id: client.user_id,
    client_id: client.id,
    form_type: "standard_joining",
    form_data: { name, tel, ...body },
    status: "submitted",
    submitted_at: new Date().toISOString(),
  })
  if (error) {
    console.error("Coach questionnaire insert error:", error.message)
    return NextResponse.json({ error: "Could not save the questionnaire" }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
