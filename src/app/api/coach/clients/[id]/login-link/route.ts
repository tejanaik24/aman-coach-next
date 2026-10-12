import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { SITE_URL } from "@/lib/site"

// Coach taps "Send login link" on a client: returns a one-time sign-in link the client opens
// from WhatsApp (no password to remember). Same host the welcome/reset links already use.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || SITE_URL

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (me?.role !== "coach") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // RLS + explicit coach_id check: a coach can only generate login links for their own clients
  const { data: client } = await supabase
    .from("clients")
    .select("user_id")
    .eq("id", id)
    .eq("coach_id", user.id)
    .maybeSingle()
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
    options: { redirectTo: `${SITE_URL}/home` },
  })
  const hashedToken = data?.properties?.hashed_token
  if (error || !hashedToken) return NextResponse.json({ error: "Could not create the login link" }, { status: 500 })

  const link = `${SITE_URL}/auth/confirm?token_hash=${hashedToken}&type=magiclink&next=/home`

  // This client signs in by link, so they never need the first-time password step.
  await admin.from("profiles").update({ must_reset_password: false }).eq("id", client.user_id)

  return NextResponse.json({ url: link })
}
