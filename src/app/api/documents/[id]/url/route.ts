import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

// Short-lived link to open a plan PDF. The row is read with the caller's own session,
// so row-level security decides whether they (coach or that client) may see it.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: doc } = await supabase
    .from("client_documents")
    .select("file_path, coach_id")
    .eq("id", id)
    .maybeSingle()
  // the file must live in the owning coach's folder (rows are inserted from the browser)
  if (!doc || !doc.file_path.startsWith(`${doc.coach_id}/`)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await admin.storage.from("client-documents").createSignedUrl(doc.file_path, 600)
  if (error || !data) return NextResponse.json({ error: "Could not open file" }, { status: 500 })
  return NextResponse.json({ url: data.signedUrl })
}
