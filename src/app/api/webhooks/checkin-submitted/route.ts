import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.json()
  const { client_id, weight, energy, sleep, notes, photos } = body

  if (!client_id) {
    return NextResponse.json({ error: "client_id required" }, { status: 400 })
  }

  const { data: client } = await supabase
    .from("users")
    .select("coach_id, display_name")
    .eq("id", client_id)
    .single()

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }

  const { error: insertError } = await supabase.from("checkins").insert({
    client_id,
    coach_id: client.coach_id,
    weight: weight || null,
    energy: energy || null,
    sleep: sleep || null,
    notes: notes || null,
    photos: photos || [],
    date: new Date().toISOString(),
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  await supabase.from("notifications").insert({
    user_id: client.coach_id,
    title: "New Check-in Received",
    body: `${client.display_name} submitted a check-in`,
    type: "checkin",
    link: `/coach/checkins`,
  })

  return NextResponse.json({ success: true })
}
