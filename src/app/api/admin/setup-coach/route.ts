import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { withRetry } from "@/lib/db-retry"

/** One-time bootstrap endpoint. Disable it in production after setup. */
export async function POST(request: Request) {
  try {
    const setupSecret = process.env.SETUP_SECRET
    const email = process.env.SETUP_COACH_EMAIL
    const password = process.env.SETUP_COACH_PASSWORD
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!setupSecret || !email || !password || !url || !serviceRoleKey) {
      return NextResponse.json({ error: "Coach setup is not configured" }, { status: 503 })
    }
    if (request.headers.get("x-setup-secret") !== setupSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existingUser = existing.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (existingUser) return NextResponse.json({ success: true, action: "already_exists", email })

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "coach", name: "Aman Khurana" },
    })
    if (createError || !created.user) {
      return NextResponse.json({ error: createError?.message || "Unable to create coach account" }, { status: 500 })
    }

    const { error: profileError } = await withRetry(() =>
      admin.from("profiles").upsert({ id: created.user.id, name: "Aman Khurana", role: "coach" })
    )
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id)
      return NextResponse.json({ error: "Unable to create coach profile" }, { status: 500 })
    }

    return NextResponse.json({ success: true, action: "created", email }, { status: 201 })
  } catch (error: unknown) {
    console.error("Setup coach API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
