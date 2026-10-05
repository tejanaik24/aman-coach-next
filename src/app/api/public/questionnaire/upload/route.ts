import { NextResponse } from "next/server"
import { uploadCheckinPhoto } from "@/lib/storage"
import { isAllowedUpload, isRateLimited } from "@/lib/request-guards"

// Public (no login) upload for the website questionnaire: photos and reports go straight
// into private storage; only the coach can open them (see api/checkin/photo-url).
const PUBLIC_UPLOAD_FOLDER = "public-questionnaire"

export async function POST(req: Request) {
  if (isRateLimited(req, "questionnaire-upload", 40, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many uploads. Please try again in a while." }, { status: 429 })
  }
  const formData = await req.formData().catch(() => null)
  const file = formData?.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }
  if (!isAllowedUpload(file)) {
    return NextResponse.json({ error: "Upload a photo (JPG, PNG, WebP) or a PDF under 4 MB" }, { status: 400 })
  }
  const path = await uploadCheckinPhoto(file, PUBLIC_UPLOAD_FOLDER)
  if (!path) return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 })
  return NextResponse.json({ path })
}
