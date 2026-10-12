import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

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

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1. Fetch submission to check ownership and referenced files
  const { data: sub } = await admin
    .from("form_submissions")
    .select("id, client_id, user_id, form_data")
    .eq("id", id)
    .maybeSingle()
  if (!sub) return NextResponse.json({ error: "Submission not found" }, { status: 404 })

  let ownerUserId: string | null = sub.user_id ? String(sub.user_id) : null

  if (sub.client_id) {
    const { data: clientRow } = await admin
      .from("clients")
      .select("id, user_id, coach_id")
      .eq("id", String(sub.client_id))
      .maybeSingle()
    if (!clientRow || clientRow.coach_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to delete this submission." },
        { status: 403 }
      )
    }
    if (!ownerUserId && clientRow.user_id) {
      ownerUserId = String(clientRow.user_id)
    }
  } else if (sub.user_id) {
    const { data: clientByUser } = await admin
      .from("clients")
      .select("id, user_id, coach_id")
      .eq("user_id", String(sub.user_id))
      .maybeSingle()
    if (clientByUser && clientByUser.coach_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to delete this submission." },
        { status: 403 }
      )
    }
  }

  // 2. Remove referenced files from storage (strictly scoped to this submission's own prefix)
  const rawPaths = extractFilePaths(sub.form_data)
  const allowedPrefixes = ownerUserId
    ? [`${ownerUserId}/`]
    : ["public-questionnaire/"]
  const filePaths = rawPaths.filter(
    (p) => !p.includes("..") && allowedPrefixes.some((prefix) => p.startsWith(prefix))
  )
  if (filePaths.length > 0) {
    await admin.storage.from("checkin-photos").remove(filePaths).catch(() => {})
    await admin.storage.from("public-questionnaire").remove(filePaths).catch(() => {})
  }

  // 3. Delete the submission row
  const { error } = await admin.from("form_submissions").delete().eq("id", id)
  if (error) {
    console.error("Delete submission error:", error.message)
    return NextResponse.json({ error: "Could not delete this form. Please try again." }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

