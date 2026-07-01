import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const COACH_ID = "b1ea3c60-b40f-4187-9f19-de0de703cfe3"
const SETUP_SECRET = process.env.SETUP_SECRET ?? "akcoach-setup-2026"
const COACH_EMAIL = "coach@akfitness.in"
const COACH_PASSWORD = "AmanCoach@2026"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get("secret")

  if (secret !== SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Update coach user to have email + password
  const { data, error } = await admin.auth.admin.updateUserById(COACH_ID, {
    email: COACH_EMAIL,
    password: COACH_PASSWORD,
    email_confirm: true,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: "Coach credentials set. You can now log in.",
    email: COACH_EMAIL,
    password: COACH_PASSWORD,
    userId: data.user.id,
  })
}
