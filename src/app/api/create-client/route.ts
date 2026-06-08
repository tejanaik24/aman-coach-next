import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not configured on server" },
      { status: 500 }
    )
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  const body = await request.json()
  const { email, password, display_name, phone, plan, coach_id } = body

  if (!email || !password || !display_name) {
    return NextResponse.json(
      { error: "email, password, and display_name are required" },
      { status: 400 }
    )
  }

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name, role: "client" },
  })

  if (authError || !authUser.user) {
    return NextResponse.json(
      { error: authError?.message || "Failed to create auth user" },
      { status: 500 }
    )
  }

  const { error: insertError } = await supabaseAdmin.from("users").insert({
    id: authUser.user.id,
    email,
    display_name,
    phone: phone || null,
    coach_id,
    role: "client",
    plan: plan || "basic",
    status: "active",
  })

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, id: authUser.user.id })
}
