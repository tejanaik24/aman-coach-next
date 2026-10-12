import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { isPlaceholderEmail } from "@/lib/phone-login"
import { isRateLimited } from "@/lib/request-guards"
import { sendAdminEmailChangedNotice } from "@/lib/email"

const STRICT_EMAIL_RE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i

const BLOCKED_PLACEHOLDER_DOMAINS = new Set([
  "clients.amankhuranafitness.com",
  "phone.akfitness.in",
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "test.org",
  "test.net",
  "test.local",
  "localhost",
  "invalid",
  "local",
  "placeholder.com",
  "fake.com",
  "none.com",
  "noemail.com",
  "mailinator.com",
  "yopmail.com",
  "tempmail.com",
  "guerrillamail.com",
  "10minutemail.com",
  "trashmail.com",
])

const COMMON_TYPO_DOMAINS = new Set([
  "gmial.com",
  "gmai.com",
  "gamil.com",
  "gmal.com",
  "gmail.co",
  "gmail.con",
  "gmail.cmo",
  "gmail.om",
  "gmail.comm",
  "yaho.com",
  "yahooo.com",
  "yahoo.co",
  "yahoo.con",
  "hotmial.com",
  "hotmai.com",
  "hotmail.co",
  "hotmail.con",
  "outlok.com",
  "outllok.com",
  "outlook.co",
  "outlook.con",
  "iclod.com",
  "icloud.co",
  "icloud.con",
])

function validateAdminEmail(rawEmail: string): string | null {
  const email = rawEmail.trim().toLowerCase()
  if (!STRICT_EMAIL_RE.test(email)) {
    return "Enter a valid email address with a real domain."
  }
  if (isPlaceholderEmail(email)) {
    return "Admin ID must be a real email address (placeholder or mobile domains are not allowed)."
  }
  const parts = email.split("@")
  if (parts.length !== 2) {
    return "Enter a valid email address."
  }
  const [local, domain] = parts
  if (!local || local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return "Enter a valid email address."
  }
  const labels = domain.split(".")
  if (labels.length < 2) {
    return "Email domain looks invalid. Please double-check it."
  }
  for (const label of labels) {
    if (!label || label.startsWith("-") || label.endsWith("-") || !/^[a-z0-9-]+$/.test(label)) {
      return "Email domain looks invalid. Please double-check it."
    }
  }
  const tld = labels[labels.length - 1]
  if (!tld || !/^[a-z]{2,24}$/.test(tld)) {
    return "Email domain extension looks invalid. Please double-check it."
  }
  if (
    BLOCKED_PLACEHOLDER_DOMAINS.has(domain) ||
    tld === "test" ||
    tld === "invalid" ||
    tld === "local" ||
    tld === "localhost" ||
    tld === "example"
  ) {
    return "Placeholder or test email domains are not allowed for Admin ID."
  }
  if (COMMON_TYPO_DOMAINS.has(domain)) {
    return `The email domain "${domain}" looks like a typo. Please double-check it.`
  }
  return null
}

export async function POST(request: Request) {
  try {
    const authSupabase = await createServerClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (profile?.role !== "coach") {
      return NextResponse.json({ error: "Forbidden: Coach account required" }, { status: 403 })
    }

    if (isRateLimited(request, `coach-account:${user.id}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait 15 minutes and try again." },
        { status: 429 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : ""
    const newLoginId = typeof body.newLoginId === "string" ? body.newLoginId.trim() : ""
    const rawConfirmLogin =
      typeof body.confirmNewLoginId === "string"
        ? body.confirmNewLoginId
        : typeof body.confirmLoginId === "string"
          ? body.confirmLoginId
          : typeof body.confirmEmail === "string"
            ? body.confirmEmail
            : ""
    const confirmNewLoginId = rawConfirmLogin.trim()
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : ""
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : ""

    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required" }, { status: 400 })
    }

    if (!newLoginId && !confirmNewLoginId && !newPassword) {
      return NextResponse.json({ error: "Enter a new Admin ID email or a new password" }, { status: 400 })
    }

    if (newLoginId || confirmNewLoginId) {
      if (!newLoginId || !confirmNewLoginId || newLoginId.toLowerCase() !== confirmNewLoginId.toLowerCase()) {
        return NextResponse.json({ error: "The two emails do not match." }, { status: 400 })
      }
      const emailErr = validateAdminEmail(newLoginId)
      if (emailErr) {
        return NextResponse.json({ error: emailErr }, { status: 400 })
      }
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 })
      }
      if (newPassword !== confirmPassword) {
        return NextResponse.json({ error: "New password and confirm password do not match" }, { status: 400 })
      }
    }

    // Verify current password using an isolated non-persisting anon client
    const verifier = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { error: verifyErr } = await verifier.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (verifyErr) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    }

    const oldEmail = user.email
    const updates: { email?: string; email_confirm?: boolean; password?: string } = {}
    let updatedEmail = user.email

    if (newLoginId) {
      const normalizedEmail = newLoginId.toLowerCase()
      if (normalizedEmail !== user.email.toLowerCase()) {
        updates.email = normalizedEmail
        updates.email_confirm = true
        updatedEmail = normalizedEmail
      }
    }

    if (newPassword) {
      updates.password = newPassword
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, updates)
      if (updateErr) {
        return NextResponse.json({ error: updateErr.message || "Could not update account" }, { status: 400 })
      }
    }

    if (updates.email) {
      try {
        const noticeRes = await sendAdminEmailChangedNotice(oldEmail, updates.email)
        console.info("[CoachAccount] Old-address notice result:", noticeRes)
      } catch (noticeErr) {
        console.warn("[CoachAccount] Could not send old-address notice email:", noticeErr)
      }
    }

    return NextResponse.json({
      success: true,
      email: updatedEmail,
      message: "Admin login credentials updated",
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not update account" },
      { status: 500 }
    )
  }
}

