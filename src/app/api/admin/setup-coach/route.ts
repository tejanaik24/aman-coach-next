import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const SETUP_SECRET = process.env.SETUP_SECRET ?? "akcoach-setup-2026"
const COACH_EMAIL = "coach@akfitness.in"
const COACH_PASSWORD = "AmanCoach@2026"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get("secret") !== SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Check if a coach already exists with this email
  const { data: existing } = await admin.auth.admin.listUsers()
  const existingCoach = existing?.users?.find((u) => u.email === COACH_EMAIL)

  if (existingCoach) {
    // Update password on existing account
    const { error } = await admin.auth.admin.updateUserById(existingCoach.id, {
      password: COACH_PASSWORD,
      email_confirm: true,
      user_metadata: { role: "coach", name: "Aman Khurana" },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, action: "updated", email: COACH_EMAIL, password: COACH_PASSWORD })
  }

  // No existing coach — create one fresh
  const { data, error } = await admin.auth.admin.createUser({
    email: COACH_EMAIL,
    password: COACH_PASSWORD,
    email_confirm: true,
    user_metadata: { role: "coach", name: "Aman Khurana" },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Insert profile row
  await admin.from("profiles").upsert({
    id: data.user.id,
    name: "Aman Khurana",
    role: "coach",
    phone: "+919815690656",
  })

  return NextResponse.json({
    success: true,
    action: "created",
    email: COACH_EMAIL,
    password: COACH_PASSWORD,
    userId: data.user.id,
  })
}
