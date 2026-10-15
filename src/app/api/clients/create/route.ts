import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { withRetry } from "@/lib/db-retry"
import { randomBytes } from "crypto"
import { queueWebhook } from "@/lib/webhook-queue"
import { phoneEmail } from "@/lib/phone-login"
import { SITE_URL } from "@/lib/site"
import { validateBillInput } from "@/lib/bill-validation"

function calculateFirstDueDate(startDate: string, explicitDueDate?: string): string {
  if (explicitDueDate && /^\d{4}-\d{2}-\d{2}$/.test(explicitDueDate)) {
    return explicitDueDate
  }
  return startDate
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: coachProfile } = await withRetry(() =>
      supabase.from("profiles").select("role").eq("id", user.id).single()
    )

    if (coachProfile?.role !== "coach") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      phone,
      goal,
      packageName,
      endDate,
      clientType,
      feeAmount,
      packageFee,
      discount,
      discountValue,
      discountMode,
      otherCharges,
      amountPaid,
      feeCurrency,
      feeDueDay,
      startDate,
      dueDate: rawDueDate,
      notes,
    } = body

    // Email is optional: clients sign in with their mobile number, which maps to a placeholder email.
    const phoneDigits = typeof phone === "string" ? phone.replace(/\D/g, "") : ""
    const rawEmail = typeof body.email === "string" ? body.email.trim() : ""
    const email = rawEmail || (phoneDigits.length >= 6 ? phoneEmail(phoneDigits) : "")

    const rawPkg = packageFee !== undefined && packageFee !== null ? packageFee : feeAmount
    const rawDisc = discountValue !== undefined && discountValue !== null ? discountValue : discount
    const rawDiscMode = discountMode === "PCT" ? "PCT" : "INR"

    const billValidation = validateBillInput({
      packageFee: rawPkg,
      discountValue: rawDisc,
      discountMode: rawDiscMode,
      otherCharges,
      amountPaid,
    })
    if (!billValidation.valid) {
      return NextResponse.json(
        { error: billValidation.firstError || "Please enter valid whole rupee amounts." },
        { status: 400 }
      )
    }

    if (!name || !email || !phone || !goal || !packageName || !feeDueDay || !startDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }

    const validCurrencies = ["INR", "USD", "EUR", "GBP", "AED", "CAD"]
    const selectedCurrency = (typeof feeCurrency === "string" && validCurrencies.includes(feeCurrency.toUpperCase()))
      ? feeCurrency.toUpperCase()
      : "INR"

    const parsedPackageFee = billValidation.values.packageFee
    const parsedDiscount = billValidation.values.discountRupees
    const parsedOtherCharges = billValidation.values.otherCharges
    const parsedFeeAmount = billValidation.values.finalAmount
    const parsedAmountPaid = billValidation.values.amountPaid

    const parsedFeeDueDay = Number(feeDueDay)
    if (!Number.isInteger(parsedFeeDueDay) || parsedFeeDueDay < 1 || parsedFeeDueDay > 28) {
      return NextResponse.json({ error: "Fee due day must be between 1 and 28" }, { status: 400 })
    }
    if (isNaN(Date.parse(startDate))) {
      return NextResponse.json({ error: "Invalid start date" }, { status: 400 })
    }
    if (clientType !== "standard" && clientType !== "antenatal") {
      return NextResponse.json({ error: "Invalid client type" }, { status: 400 })
    }

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const initialPassword = randomBytes(18).toString("base64url")

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: initialPassword,
      email_confirm: true,
      user_metadata: { name, role: "client", phone: phoneDigits || null },
    })

    if (authError) {
      if (
        authError.message.toLowerCase().includes("already been registered") ||
        authError.message.toLowerCase().includes("already exists") ||
        authError.code === "email_exists" ||
        (authError as { status?: number }).status === 422
      ) {
        return NextResponse.json({ error: rawEmail ? "This email is already registered" : "A client with this mobile number already exists" }, { status: 409 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const newUserId = authData.user.id

    const { data: recoveryData, error: recoveryError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${SITE_URL}/reset-password` },
    })
    const hashedToken = recoveryData?.properties?.hashed_token
    if (recoveryError || !hashedToken) {
      await admin.auth.admin.deleteUser(newUserId)
      return NextResponse.json({ error: "Failed to create secure account setup link" }, { status: 500 })
    }
    const setupUrl = `${SITE_URL}/auth/confirm?token_hash=${hashedToken}&type=recovery&next=/reset-password`

    const { data: clientData, error: clientError } = await withRetry(() =>
      supabase
        .from("clients")
        .insert({
          user_id: newUserId,
          coach_id: user.id,
          goal,
          package_name: packageName,
          end_date: endDate ?? null,
          client_type: clientType,
          fee_amount: parsedFeeAmount,
          fee_currency: selectedCurrency,
          fee_due_day: parsedFeeDueDay,
          start_date: startDate,
          status: "active",
          notes: notes ?? null,
        })
        .select("id")
        .single()
    )

    if (clientError) {
      await admin.auth.admin.deleteUser(newUserId)
      return NextResponse.json({ error: clientError.message }, { status: 500 })
    }

    const dueDate = calculateFirstDueDate(startDate, rawDueDate)
    const feeStatus: "paid" | "pending" =
      parsedFeeAmount > 0 && parsedAmountPaid >= parsedFeeAmount ? "paid" : "pending"
    const paidDate = feeStatus === "paid" ? dueDate : null

    const { error: feeError } = await withRetry(() =>
      supabase.from("fees").insert({
        client_id: clientData.id,
        package_fee: parsedPackageFee,
        discount: parsedDiscount,
        other_charges: parsedOtherCharges,
        amount: parsedFeeAmount,
        amount_paid: parsedAmountPaid,
        currency: selectedCurrency,
        due_date: dueDate,
        paid_date: paidDate,
        status: feeStatus,
      })
    )

    if (feeError) {
      await supabase.from("clients").delete().eq("id", clientData.id)
      await admin.auth.admin.deleteUser(newUserId)
      return NextResponse.json({ error: "Failed to create fee record" }, { status: 500 })
    }

    await queueWebhook("new_client_welcome", {
      clientId: clientData.id,
      display_name: name,
      email,
      phone: typeof phone === "string" ? phone.replace(/\D/g, "") : "",
      clientType,
      onboardingUrl: clientType === "antenatal"
        ? `${SITE_URL}/onboarding/antenatal`
        : `${SITE_URL}/onboarding`,
      setupUrl,
    }).catch((webhookError) => {
      console.error("New client welcome queued for retry:", webhookError)
    })

    return NextResponse.json({ success: true, clientId: clientData.id, password: initialPassword }, { status: 201 })
  } catch (err: unknown) {
    console.error("Client creation API error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
