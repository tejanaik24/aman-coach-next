import { NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

// push/send later POSTs to this URL from our server, so only accept real browser push services.
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /(^|\.)push\.apple\.com$/, /^updates\.push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/]
function isKnownPushEndpoint(endpoint: unknown): boolean {
  if (typeof endpoint !== "string") return false
  try {
    const u = new URL(endpoint)
    return u.protocol === "https:" && PUSH_HOSTS.some((h) => h.test(u.hostname))
  } catch {
    return false
  }
}

async function isCoach(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle()
  return data?.role === "coach"
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader)
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { subscription } = await req.json()
    if (!subscription) return NextResponse.json({ error: "Missing subscription" }, { status: 400 })
    if (!isKnownPushEndpoint(subscription?.endpoint)) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 })
    }

    // Coach phones are stored with no client_id (see lib/server/coach-push.ts).
    // The unique index treats NULL client_ids as different, so replace by endpoint instead of upsert.
    if (await isCoach(supabase, user.id)) {
      await supabase.from("push_subscriptions").delete().is("client_id", null).eq("subscription->>endpoint", subscription.endpoint)
      const { error } = await supabase.from("push_subscriptions").insert({ client_id: null, subscription })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    const { data: client } = await supabase.from("clients").select("id").eq("user_id", user.id).single()
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })

    const { error: upsertErr } = await supabase.from("push_subscriptions").upsert(
      { client_id: client.id, subscription },
      { onConflict: "client_id,subscription->>endpoint" }
    )
    if (upsertErr) {
      console.error("Push subscribe upsert error:", upsertErr)
      return NextResponse.json({ error: upsertErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error("Push subscribe error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader)
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { endpoint } = await req.json()
    if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 })

    if (await isCoach(supabase, user.id)) {
      const { error } = await supabase.from("push_subscriptions").delete().is("client_id", null).eq("subscription->>endpoint", endpoint)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    const { data: client } = await supabase.from("clients").select("id").eq("user_id", user.id).single()
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })

    const { error: delErr } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("client_id", client.id)
      .eq("subscription->>endpoint", endpoint)
    if (delErr) {
      console.error("Push unsubscribe delete error:", delErr)
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error("Push unsubscribe error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
