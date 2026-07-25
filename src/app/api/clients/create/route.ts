import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendClientWelcomeMessage } from "@/lib/whatsapp"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, phone, clientType, coachId, notes } = body

    if (!name || !phone) {
      return NextResponse.json({ error: "Client name and phone are required" }, { status: 400 })
    }

    // 1. Insert or get user profile
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .insert({
        name,
        email: email || `${phone.replace(/\D/g, "")}@amankhuranafitness.com`,
        phone,
        role: "client",
        created_at: new Date().toISOString()
      })
      .select("id")
      .maybeSingle()

    let userId = profile?.id

    if (profErr || !userId) {
      // Find existing profile if email/phone exists
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .maybeSingle()
      userId = existing?.id || null
    }

    // 2. Create client record
    const clientRecord = {
      user_id: userId,
      coach_id: coachId || null,
      client_type: clientType || "standard",
      status: "active",
      notes: notes || null,
      created_at: new Date().toISOString()
    }

    const { data: newClient, error: clientErr } = await supabase
      .from("clients")
      .insert(clientRecord)
      .select("id")
      .maybeSingle()

    if (clientErr) {
      console.error("Client insert error:", clientErr)
      return NextResponse.json({ error: clientErr.message }, { status: 500 })
    }

    // 3. Send automated Welcome WhatsApp Message via WAHA
    sendClientWelcomeMessage(phone, name)
      .catch(e => console.error("Welcome WhatsApp error:", e))

    return NextResponse.json({
      success: true,
      clientId: newClient?.id,
      message: "Client created and welcome WhatsApp message queued"
    })
  } catch (err: any) {
    console.error("Client creation API error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
