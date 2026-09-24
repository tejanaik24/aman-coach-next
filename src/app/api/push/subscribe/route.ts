import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader)
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: client } = await supabase.from("clients").select("id").eq("user_id", user.id).single()
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })

    const { subscription } = await req.json()
    if (!subscription) return NextResponse.json({ error: "Missing subscription" }, { status: 400 })

    const { error: upsertErr } = await supabase.from("push_subscriptions").upsert(
      { client_id: client.id, subscription },
      { onConflict: "client_id,subscription->>endpoint" }
    )
    if (upsertErr) {
      console.error("Push subscribe upsert error:", upsertErr)
      return NextResponse.json({ error: upsertErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Push subscribe error:", err)
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
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

    const { error: delErr } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("subscription->>endpoint", endpoint)
    if (delErr) {
      console.error("Push unsubscribe delete error:", delErr)
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Push unsubscribe error:", err)
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}
