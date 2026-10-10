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

  // 1. Fetch submission to check for referenced files
  const { data: sub } = await admin.from("form_submissions").select("id, form_data").eq("id", id).maybeSingle()
  if (!sub) return NextResponse.json({ error: "Submission not found" }, { status: 404 })

  // 2. Remove referenced files from storage
  const filePaths = extractFilePaths(sub.form_data)
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

