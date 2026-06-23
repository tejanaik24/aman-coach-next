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
  const { name, phone, goal, packageName, feeAmount, feeDueDay, startDate, notes } = body

  // Basic validation
  if (!name || !phone || !goal || !packageName || !feeAmount || !feeDueDay || !startDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Admin client (service role) for creating auth users
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Create auth user (phone_confirm: true skips OTP verification for coach-created users)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    phone,
    phone_confirm: true,
    user_metadata: {
      name,
      role: "client",
      phone,
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
        { error: "This number is already registered" },
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

  // Create first fee record
  const dueDate = calculateFirstDueDate(Number(feeDueDay), startDate)
  await supabase.from("fees").insert({
    client_id: clientData.id,
    amount: feeAmount,
    currency: "INR",
    due_date: dueDate,
    status: "pending",
  })

  return NextResponse.json({ success: true, clientId: clientData.id }, { status: 201 })
}
