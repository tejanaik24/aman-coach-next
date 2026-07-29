import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { uploadCheckinPhoto } from "@/lib/storage"

export async function POST(req: Request) {
  const authSupabase = await createServerClient()
  const { data: { user } } = await authSupabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  const path = await uploadCheckinPhoto(file, user.id)
  if (!path) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }

  return NextResponse.json({ path })
}
