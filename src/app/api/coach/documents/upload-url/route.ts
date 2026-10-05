import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

// Step 1 of a plan upload: hand the browser a one-time signed URL so the PDF goes
// straight to storage (avoids the ~4.5 MB serverless request-body limit).
const BUCKET = "client-documents"

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "coach") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { filename } = (await request.json().catch(() => ({}))) as { filename?: string }
  const ext = (filename?.split(".").pop() ?? "pdf").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "pdf"
  if (!["pdf", "jpg", "jpeg", "png", "webp"].includes(ext)) {
    return NextResponse.json({ error: "Upload a PDF or an image" }, { status: 400 })
  }

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error || !data) return NextResponse.json({ error: "Could not start upload" }, { status: 500 })

  return NextResponse.json({ path, token: data.token })
}
