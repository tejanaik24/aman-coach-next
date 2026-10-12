import { NextResponse, after } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { loginIdentifierToEmail, isPlaceholderEmail } from "@/lib/phone-login"
import { sendPasswordResetEmail } from "@/lib/email"
import { sendWelcomeSetupTemplate } from "@/lib/whatsapp"
import { isRateLimited } from "@/lib/request-guards"
import { SITE_URL } from "@/lib/site"

const NEUTRAL_RESET_MSG =
  "If this account exists, we have sent a reset link. If you do not receive it in a few minutes, message Coach Aman on WhatsApp."

const MIN_RESPONSE_MS = 120

function buildNeutralResponse(rawInput: string) {
  const waHelpUrl = `https://wa.me/919815690656?text=${encodeURIComponent(
    `Hi Coach Aman, please send me my login link for my account (${rawInput}).`
  )}`
  return NextResponse.json({
    success: true,
    message: NEUTRAL_RESET_MSG,
    waHelpUrl,
  })
}

async function dispatchPasswordReset(raw: string): Promise<void> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) return

    const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const resolvedEmail = loginIdentifierToEmail(raw).toLowerCase()
    const digits = raw.replace(/\D/g, "").slice(-10)

    let targetUserId: string | null = null
    let targetEmail: string | null = null
    let targetName = "Champion"
    let targetPhone: string | null = digits.length === 10 ? digits : null

    // 1. Check profiles by phone if 10 digits provided
    if (digits.length === 10) {
      const { data: profByPhone } = await admin
        .from("profiles")
        .select("id, name, phone")
        .ilike("phone", `%${digits}`)
        .limit(1)
        .maybeSingle()

      if (profByPhone) {
        targetUserId = profByPhone.id
        targetName = profByPhone.name || targetName
        targetPhone = profByPhone.phone || targetPhone
      }
    }

    // 2. If found by profile, look up auth user by ID; otherwise try generateLink directly with resolvedEmail
    if (targetUserId) {
      const { data: uData } = await admin.auth.admin.getUserById(targetUserId)
      if (uData?.user?.email) {
        targetEmail = uData.user.email
      }
    } else {
      targetEmail = resolvedEmail
    }

    if (!targetEmail) {
      return
    }

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: targetEmail,
      options: { redirectTo: `${SITE_URL}/reset-password` },
    })

    const hashedToken = linkData?.properties?.hashed_token
    if (linkErr || !hashedToken) {
      return
    }

    const authUser = linkData.user
    if (authUser?.id && !targetUserId) {
      targetUserId = authUser.id
      const { data: prof } = await admin
        .from("profiles")
        .select("name, phone")
        .eq("id", authUser.id)
        .maybeSingle()
      if (prof?.name) targetName = prof.name
      if (prof?.phone) targetPhone = prof.phone
    }

    const resetUrl = `${SITE_URL}/auth/confirm?token_hash=${hashedToken}&type=recovery&next=/reset-password`

    if (!isPlaceholderEmail(targetEmail)) {
      try {
        const mailRes = await sendPasswordResetEmail(targetEmail, targetName, resetUrl)
        console.info("[ForgotPassword] Real account email send attempted:", {
          userId: targetUserId,
          to: targetEmail,
          result: mailRes,
        })
      } catch (e) {
        console.warn("Forgot password email warning:", e)
      }
    }

    if (targetPhone) {
      try {
        const waRes = await sendWelcomeSetupTemplate(targetPhone, targetName, resetUrl, `${SITE_URL}/home`)
        console.info("[ForgotPassword] Real account WhatsApp send attempted:", {
          userId: targetUserId,
          phone: targetPhone,
          success: waRes.success,
          error: waRes.error,
        })
      } catch (e) {
        console.warn("Forgot password WhatsApp warning:", e)
      }
    }
  } catch (err) {
    console.warn("[ForgotPassword] Background dispatch warning:", err)
  }
}

export async function POST(request: Request) {
  try {
    if (isRateLimited(request, "forgot-password", 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a few minutes and try again." },
        { status: 429 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const raw = typeof body.identifier === "string" ? body.identifier.trim() : ""
    if (!raw) {
      return NextResponse.json({ error: "Enter your mobile number or email" }, { status: 400 })
    }

    const startedAt = Date.now()
    after(async () => {
      await dispatchPasswordReset(raw)
    })
    const elapsed = Date.now() - startedAt
    if (elapsed < MIN_RESPONSE_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_RESPONSE_MS - elapsed))
    }

    return buildNeutralResponse(raw)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not process request" },
      { status: 500 }
    )
  }
}

