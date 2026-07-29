import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const CHECKIN_BUCKET = "checkin-photos"

export async function uploadCheckinPhoto(file: File, userId: string): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg"
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from(CHECKIN_BUCKET)
    .upload(path, file, { contentType: file.type })

  if (error) {
    console.error("Checkin photo upload failed:", error.message)
    return null
  }

  return path
}

export async function getSignedCheckinPhotoUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(CHECKIN_BUCKET)
    .createSignedUrl(path, expiresIn)

  if (error) {
    console.error("Signed URL creation failed:", error.message)
    return null
  }

  return data.signedUrl
}
