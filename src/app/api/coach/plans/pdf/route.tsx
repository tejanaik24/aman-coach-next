import { NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { createClient } from "@/lib/supabase/server"
import { PlanPdf } from "@/lib/plan/pdf"
import { SITE_URL } from "@/lib/site"
import type { PlanDoc } from "@/lib/plan/types"

export const runtime = "nodejs"
export const maxDuration = 30

// Coach's plan PDF, built here instead of on the phone (see lib/plan/pdf-client.ts).
// Renders the plan exactly as the editor has it (it may not be saved yet), so it takes the doc in the body.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (me?.role !== "coach") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = (await req.json().catch(() => null)) as { doc?: PlanDoc } | null
  const doc = body?.doc
  if (!doc?.data || (doc.kind !== "workout" && doc.kind !== "diet")) return NextResponse.json({ error: "Bad plan" }, { status: 400 })

  // Fonts and logo come from the site's own public files
  const buf = await renderToBuffer(<PlanPdf doc={doc} assetBase={SITE_URL} />)
  return new NextResponse(new Uint8Array(buf), {
    headers: { "Content-Type": "application/pdf", "Cache-Control": "no-store" },
  })
}
