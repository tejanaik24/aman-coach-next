import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { getSignedCheckinPhotoUrl } from "@/lib/storage"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(req: Request) {
  const authSupabase = await createServerClient()
  const { data: { user } } = await authSupabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const path = searchParams.get("path")
  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 })
  }

  const ownerUserId = path.split("/")[0]

  const isOwner = ownerUserId === user.id
  let isCoach = false
  if (!isOwner) {
    const { data: coachClient } = await supabase
      .from("clients")
      .select("id")
      .eq("coach_id", user.id)
      .eq("user_id", ownerUserId)
      .maybeSingle()
    isCoach = !!coachClient
  }

  if (!isOwner && !isCoach) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = await getSignedCheckinPhotoUrl(path)
  if (!url) {
    return NextResponse.json({ error: "Failed to generate signed URL" }, { status: 500 })
  }

  return NextResponse.json({ url })
}
