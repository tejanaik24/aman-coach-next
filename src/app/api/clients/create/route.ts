import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

function calculateFirstDueDate(feeDueDay: number, startDate: string): string {
  const d = new Date(startDate)
  const year = d.getFullYear()
  const month = d.getMonth()
  const day = d.getDate()

  if (day <= feeDueDay) {
    return new Date(year, month, feeDueDay).toISOString().split("T")[0]
  }
  return new Date(year, month + 1, feeDueDay).toISOString().split("T")[0]
}

export async function POST(request: Request) {
  // Verify the requesting user is an authenticated coach
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: coachProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (coachProfile?.role !== "coach") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const { name, email, phone, goal, packageName, feeAmount, feeDueDay, startDate, notes } = body

  // Server-side validation
  if (!name || !email || !goal || !packageName || !feeAmount || !feeDueDay || !startDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
  }

  const parsedFeeAmount = Number(feeAmount)
  const parsedFeeDueDay = Number(feeDueDay)
  if (isNaN(parsedFeeAmount) || parsedFeeAmount <= 0) {
    return NextResponse.json({ error: "Fee amount must be a positive number" }, { status: 400 })
  }
  if (!Number.isInteger(parsedFeeDueDay) || parsedFeeDueDay < 1 || parsedFeeDueDay > 28) {
    return NextResponse.json({ error: "Fee due day must be between 1 and 28" }, { status: 400 })
  }
  if (isNaN(Date.parse(startDate))) {
    return NextResponse.json({ error: "Invalid start date" }, { status: 400 })
  }

  // Admin client (service role) for creating auth users
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const defaultPassword = "Welcome@123"

  // Create auth user with email + password
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: defaultPassword,
    email_confirm: true,
    user_metadata: {
      name,
      role: "client",
      phone: phone ?? null,
    },
  })

  if (authError) {
    if (
      authError.message.toLowerCase().includes("already been registered") ||
      authError.message.toLowerCase().includes("already exists") ||
      authError.code === "email_exists" ||
      (authError as { status?: number }).status === 422
    ) {
      return NextResponse.json(
        { error: "This email is already registered" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const newUserId = authData.user.id

  // Insert client record using coach's session (RLS: coach_id = auth.uid())
  const { data: clientData, error: clientError } = await supabase
    .from("clients")
    .insert({
      user_id: newUserId,
      coach_id: user.id,
      goal,
      package_name: packageName,
      fee_amount: feeAmount,
      fee_currency: "INR",
      fee_due_day: feeDueDay,
      start_date: startDate,
      status: "active",
      notes: notes ?? null,
    })
    .select("id")
    .single()

  if (clientError) {
    // Rollback: delete the auth user we just created
    await admin.auth.admin.deleteUser(newUserId)
    return NextResponse.json({ error: clientError.message }, { status: 500 })
  }

  // Create first fee record — rollback client + auth user if this fails
  const dueDate = calculateFirstDueDate(parsedFeeDueDay, startDate)
  const { error: feeError } = await supabase.from("fees").insert({
    client_id: clientData.id,
    amount: parsedFeeAmount,
    currency: "INR",
    due_date: dueDate,
    status: "pending",
  })

  if (feeError) {
    await supabase.from("clients").delete().eq("id", clientData.id)
    await admin.auth.admin.deleteUser(newUserId)
    return NextResponse.json({ error: "Failed to create fee record" }, { status: 500 })
  }

  return NextResponse.json({ success: true, clientId: clientData.id, password: defaultPassword }, { status: 201 })
}
