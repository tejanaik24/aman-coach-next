import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { isPlaceholderEmail, phoneEmail } from "@/lib/phone-login"
import { goalForPackage } from "@/lib/package-goal"
import { validateBillInput } from "@/lib/bill-validation"

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (me?.role !== "coach") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data: client } = await supabase.from("clients").select("id, user_id, coach_id").eq("id", id).maybeSingle()
  if (!client || client.coach_id !== user.id) return NextResponse.json({ error: "Client not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const { name, phone, package_name, fee_amount, fee_due_day, start_date, end_date, notes, status, emi_allowed } = body

  if (status !== undefined && !["active", "paused", "inactive"].includes(status)) {
    return NextResponse.json({ error: "Pick Active, Paused or Stopped." }, { status: 400 })
  }
  if (name !== undefined && !String(name).trim()) {
    return NextResponse.json({ error: "Please enter the client's name." }, { status: 400 })
  }
  if (phone !== undefined && String(phone).replace(/\D/g, "").length < 10) {
    return NextResponse.json({ error: "Please enter a 10-digit phone number." }, { status: 400 })
  }

  let validatedFeeAmount: number | undefined
  if (fee_amount !== undefined) {
    const feeCheck = validateBillInput({ packageFee: fee_amount })
    if (!feeCheck.valid) {
      return NextResponse.json({ error: feeCheck.firstError || "Please enter the package fee." }, { status: 400 })
    }
    validatedFeeAmount = feeCheck.values.packageFee
  }

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1. Update clients table first (the bigger change); if it fails nothing is half-saved
  const clientUpdates: Record<string, unknown> = {}
  if (package_name !== undefined) {
    clientUpdates.package_name = package_name
    clientUpdates.goal = goalForPackage(package_name)
  }
  if (validatedFeeAmount !== undefined) clientUpdates.fee_amount = validatedFeeAmount
  if (fee_due_day !== undefined) clientUpdates.fee_due_day = Number(fee_due_day) || 1
  if (start_date !== undefined) clientUpdates.start_date = start_date
  if (end_date !== undefined) clientUpdates.end_date = end_date
  if (notes !== undefined) clientUpdates.notes = notes
  if (status !== undefined) clientUpdates.status = status
  if (emi_allowed !== undefined) clientUpdates.emi_allowed = Boolean(emi_allowed)

  if (Object.keys(clientUpdates).length > 0) {
    const { error: clientErr } = await admin.from("clients").update(clientUpdates).eq("id", id)
    if (clientErr) return NextResponse.json({ error: "Could not save the client. Please try again." }, { status: 500 })
  }

  // 2. Update name / phone (profiles) and the login email
  if (client.user_id && (name !== undefined || phone !== undefined)) {
    const profileUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) profileUpdates.name = String(name).trim()
    if (phone !== undefined) {
      const cleanedPhone = String(phone).replace(/\D/g, "")
      profileUpdates.phone = cleanedPhone
    }

    const { error: profErr } = await admin.from("profiles").update(profileUpdates).eq("id", client.user_id)
    if (profErr) return NextResponse.json({ error: "Could not save the name or phone. Please try again." }, { status: 500 })

    // If phone changed, check if auth email is a placeholder email
    if (phone !== undefined) {
      const { data: authUserData } = await admin.auth.admin.getUserById(client.user_id)
      const currentEmail = authUserData?.user?.email
      if (currentEmail && isPlaceholderEmail(currentEmail)) {
        const cleanedPhone = String(phone).replace(/\D/g, "")
        const newEmail = phoneEmail(cleanedPhone)
        const { error: authErr } = await admin.auth.admin.updateUserById(client.user_id, {
          email: newEmail,
          email_confirm: true,
        })
        if (authErr) {
          console.error("Failed to update auth email:", authErr.message)
          return NextResponse.json({ error: "Saved, but the client's login number could not be changed. Please try the phone again." }, { status: 500 })
        }
      }
    }
  }

  return NextResponse.json({ success: true })
}

function extractFilePaths(data: unknown): string[] {
  const paths: string[] = []
  function recurse(val: unknown) {
    if (!val) return
    if (typeof val === "string") {
      if (/^[^/]+\/[^/]+\.(jpe?g|png|webp|gif|heic|pdf)$/i.test(val)) {
        paths.push(val)
      }
    } else if (Array.isArray(val)) {
      for (const item of val) recurse(item)
    } else if (typeof val === "object") {
      for (const v of Object.values(val as Record<string, unknown>)) recurse(v)
    }
  }
  recurse(data)
  return Array.from(new Set(paths))
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (me?.role !== "coach") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data: client } = await supabase.from("clients").select("id, user_id, coach_id").eq("id", id).maybeSingle()
  if (!client || client.coach_id !== user.id) return NextResponse.json({ error: "Client not found" }, { status: 404 })

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const userId = client.user_id
  // Never delete the coach's own login (e.g. if Aman added himself as a client with his own account).
  if (userId === user.id) {
    return NextResponse.json({ error: "This client uses your own login, so it can't be deleted here. Use Stop client instead." }, { status: 400 })
  }

  // 1. STORAGE FILES
  // 1a. client-documents
  const { data: clientDocs } = await admin.from("client_documents").select("file_path").eq("client_id", id)
  const docPaths = (clientDocs ?? []).map((d) => d.file_path).filter(Boolean)
  if (docPaths.length > 0) {
    await admin.storage.from("client-documents").remove(docPaths)
  }

  // 1b. checkin-photos/<user_id>/
  if (userId) {
    // list() returns 100 files at most, so keep going until the folder is empty
    for (let round = 0; round < 50; round++) {
      const { data: checkinFiles } = await admin.storage.from("checkin-photos").list(userId, { limit: 100 })
      if (!checkinFiles || checkinFiles.length === 0) break
      const { error: rmErr } = await admin.storage.from("checkin-photos").remove(checkinFiles.map((f) => `${userId}/${f.name}`))
      if (rmErr) break
    }
  }

  // 1c. files referenced in their forms
  const formQuery = userId
    ? admin.from("form_submissions").select("form_data").or(`client_id.eq.${id},user_id.eq.${userId}`)
    : admin.from("form_submissions").select("form_data").eq("client_id", id)
  const { data: formRows } = await formQuery
  const formFilePaths: string[] = []
  for (const row of formRows ?? []) {
    formFilePaths.push(...extractFilePaths(row.form_data))
  }
  if (formFilePaths.length > 0) {
    await admin.storage.from("checkin-photos").remove(formFilePaths)
    await admin.storage.from("public-questionnaire").remove(formFilePaths).catch(() => {})
  }

  // 2. ROWS
  // pending_webhooks
  try {
    const filter = userId
      ? `payload->>client_id.eq.${id},payload->>clientId.eq.${id},payload->>user_id.eq.${userId}`
      : `payload->>client_id.eq.${id},payload->>clientId.eq.${id}`
    await admin.from("pending_webhooks").delete().or(filter)
  } catch {}

  // fees
  await admin.from("fees").delete().eq("client_id", id)

  // form_submissions
  if (userId) {
    await admin.from("form_submissions").delete().or(`client_id.eq.${id},user_id.eq.${userId}`)
  } else {
    await admin.from("form_submissions").delete().eq("client_id", id)
  }

  // checkins
  await admin.from("checkins").delete().eq("client_id", id)

  // followups
  await admin.from("followups").delete().eq("client_id", id)

  // client_documents
  await admin.from("client_documents").delete().eq("client_id", id)

  // client_badges
  await admin.from("client_badges").delete().eq("client_id", id)

  // plans, bookings, etc.
  await admin.from("workout_plans").delete().eq("client_id", id)
  await admin.from("nutrition_plans").delete().eq("client_id", id)
  await admin.from("bookings").delete().eq("client_id", id)
  await admin.from("invoices").delete().eq("client_id", id)
  await admin.from("payments").delete().eq("client_id", id)
  await admin.from("push_subscriptions").delete().eq("client_id", id)
  await admin.from("reminder_log").delete().eq("client_id", id)

  if (userId) {
    await admin.from("form_drafts").delete().eq("user_id", userId)
    await admin.from("onboarding_forms").delete().eq("user_id", userId)
  }

  // clients
  const { error: delClientErr } = await admin.from("clients").delete().eq("id", id)
  if (delClientErr) {
    console.error("Delete client error:", delClientErr.message)
    return NextResponse.json({ error: "Could not delete the client. Nothing else was lost; please try again." }, { status: 500 })
  }

  // profiles
  if (userId) {
    await admin.from("profiles").delete().eq("id", userId)
  }

  // 3. AUTH USER
  if (userId) {
    await admin.auth.admin.deleteUser(userId)
  }

  return NextResponse.json({ success: true })
}

