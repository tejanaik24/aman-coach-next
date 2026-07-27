import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const COACH_EMAIL = "coach@akfitness.in"
const COACH_PASSWORD = "AmanCoach@2026"

export async function GET(request: Request) {
  const SETUP_SECRET = process.env.SETUP_SECRET
  if (!SETUP_SECRET) {
    return NextResponse.json({ error: "SETUP_SECRET environment variable is missing" }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  if (searchParams.get("secret") !== SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Try signing up first
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: COACH_EMAIL,
    password: COACH_PASSWORD,
    options: {
      data: { role: "coach", name: "Aman Khurana" },
    },
  })

  // If user already exists, try signing in to verify credentials work
  if (signUpError?.message?.toLowerCase().includes("already registered") || signUpError?.message?.toLowerCase().includes("already exists")) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: COACH_EMAIL,
      password: COACH_PASSWORD,
    })
    if (signInError) {
      // Credentials exist but password is different — use admin to reset
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
      // Find user by email via REST
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(COACH_EMAIL)}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          },
        }
      )
      const users = await res.json()
      const userId = users?.users?.[0]?.id
      if (!userId) return NextResponse.json({ error: "Could not find existing coach user" }, { status: 500 })

      const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password: COACH_PASSWORD })
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

      return NextResponse.json({ success: true, action: "password_reset", email: COACH_EMAIL, password: COACH_PASSWORD })
    }
    return NextResponse.json({ success: true, action: "already_exists_login_works", email: COACH_EMAIL, password: COACH_PASSWORD })
  }

  if (signUpError) {
    return NextResponse.json({ error: signUpError.message }, { status: 500 })
  }

  // Insert profile row for new user
  if (signUpData?.user) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    await admin.from("profiles").upsert({
      id: signUpData.user.id,
      name: "Aman Khurana",
      role: "coach",
      phone: "+919815690656",
    })
  }

  return NextResponse.json({
    success: true,
    action: "created",
    email: COACH_EMAIL,
    password: COACH_PASSWORD,
  })
}
