import { timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { withRetry } from "@/lib/db-retry"
import { isRateLimited } from "@/lib/request-guards"

function secretsMatch(provided: string | null, expected: string): boolean {
  if (!provided) return false
  const a = Buffer.from(provided, "utf8")
  const b = Buffer.from(expected, "utf8")
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/** One-time bootstrap or existing-coach lockout recovery endpoint. Never creates a second coach. */
export async function POST(request: Request) {
  try {
    if (isRateLimited(request, "setup-coach", 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a few minutes and try again." },
        { status: 429 }
      )
    }

    const setupSecret = process.env.SETUP_SECRET
    const email = process.env.SETUP_COACH_EMAIL
    const password = process.env.SETUP_COACH_PASSWORD
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!setupSecret || !email || !password || !url || !serviceRoleKey) {
      return NextResponse.json({ error: "Coach setup is not configured" }, { status: 503 })
    }
    if (!secretsMatch(request.headers.get("x-setup-secret"), setupSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: coachProfiles, error: coachQueryError } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "coach")
      .order("id", { ascending: true })

    if (coachQueryError) {
      return NextResponse.json({ error: "Unable to query coach profiles" }, { status: 500 })
    }

    const coaches = coachProfiles ?? []

    if (coaches.length > 1) {
      const ids = coaches.map((c) => c.id)
      return NextResponse.json(
        {
          error: `Multiple coach profiles exist (${ids.join(", ")}); refusing to guess which coach to reset.`,
          ids,
        },
        { status: 409 }
      )
    }

    if (coaches.length === 1) {
      const existingCoachId = coaches[0].id
      const { error: updateError } = await admin.auth.admin.updateUserById(existingCoachId, {
        email,
        password,
        email_confirm: true,
      })
      if (updateError) {
        return NextResponse.json(
          { error: updateError.message || "Unable to reset existing coach account" },
          { status: 500 }
        )
      }
      const { error: profileUpdateError } = await withRetry(() =>
        admin
          .from("profiles")
          .update({ role: "coach", must_reset_password: false })
          .eq("id", existingCoachId)
      )
      if (profileUpdateError) {
        return NextResponse.json(
          { error: profileUpdateError.message || "Unable to unlock existing coach profile" },
          { status: 500 }
        )
      }
      return NextResponse.json({
        success: true,
        action: "reset_existing_coach",
        id: existingCoachId,
      })
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "coach", name: "Aman Khurana" },
    })
    if (createError || !created.user) {
      return NextResponse.json(
        { error: createError?.message || "Unable to create coach account" },
        { status: 500 }
      )
    }

    const { error: profileError } = await withRetry(() =>
      admin.from("profiles").upsert({
        id: created.user.id,
        name: "Aman Khurana",
        role: "coach",
        must_reset_password: false,
      })
    )
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id)
      return NextResponse.json({ error: "Unable to create coach profile" }, { status: 500 })
    }

    return NextResponse.json(
      { success: true, action: "created", id: created.user.id, email },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error("Setup coach API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
