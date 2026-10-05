import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

// Coach taps "Send login link" on a client: returns a one-time sign-in link the client opens
// from WhatsApp (no password to remember). Same host the welcome/reset links already use.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://aman-coach-next.vercel.app"

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (me?.role !== "coach") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // RLS: a coach can only read their own clients
  const { data: client } = await supabase.from("clients").select("user_id").eq("id", id).maybeSingle()
  if (!client?.user_id) return NextResponse.json({ error: "Client not found" }, { status: 404 })

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: authUser, error: userErr } = await admin.auth.admin.getUserById(client.user_id)
  const email = authUser?.user?.email
  if (userErr || !email) return NextResponse.json({ error: "Client has no login yet" }, { status: 404 })

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${APP_URL}/login` },
  })
  const link = data?.properties?.action_link
  if (error || !link) return NextResponse.json({ error: "Could not create the login link" }, { status: 500 })

  // This client signs in by link, so they never need the first-time password step.
  await admin.from("profiles").update({ must_reset_password: false }).eq("id", client.user_id)

  return NextResponse.json({ url: link })
}
