import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  if (request.headers.get("x-automation-secret") !== process.env.AUTOMATION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from("users")
    .select("id, display_name, email, phone, coach_id")
    .eq("role", "client")
    .eq("status", "active")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    data.map((c) => ({
      id: c.id,
      display_name: c.display_name,
      email: c.email,
      phone: c.phone,
      coach_id: c.coach_id,
    }))
  )
}
