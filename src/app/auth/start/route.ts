import { type NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { readLoginLink } from "@/lib/server/login-link"

// Long-lived login links from WhatsApp land here (see lib/server/login-link.ts).
// GET only shows a button, so WhatsApp's link preview cannot use the link; POST signs the person in.
export async function GET(request: NextRequest) {
  const t = new URL(request.url).searchParams.get("t") ?? ""
  if (!readLoginLink(t)) return NextResponse.redirect(new URL("/login?error=link_expired", request.url))
  const safe = t.replace(/[^A-Za-z0-9_.-]/g, "")
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Aman Khurana Fitness</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#000;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:24px}
.card{max-width:340px}h1{font-size:22px;margin:0 0 8px}p{color:#a1a1aa;margin:0 0 24px;font-size:15px}
button{width:100%;height:52px;border:0;border-radius:999px;background:#f5b400;color:#000;font-size:16px;font-weight:700;cursor:pointer}
</style></head><body><form class="card" method="post" action="/auth/start">
<h1>Aman Khurana Fitness</h1><p>Tap the button to open your app.</p>
<input type="hidden" name="t" value="${safe}">
<button type="submit">Open my app</button></form></body></html>`
  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  })
}

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const link = readLoginLink(String(form.get("t") ?? ""))
  const fail = (e = "link_expired") => NextResponse.redirect(new URL(`/login?error=${e}`, request.url), 303)
  if (!link) return fail()

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: profile } = await admin.from("profiles").select("must_reset_password").eq("id", link.userId).maybeSingle()
  // A setup link works until the client has made a password; after that they log in normally.
  if (link.kind === "setup" && profile && !profile.must_reset_password) return fail("already_set")

  const { data: authUser } = await admin.auth.admin.getUserById(link.userId)
  const email = authUser?.user?.email
  if (!email) return fail()

  const type = link.kind === "setup" ? "recovery" : "magiclink"
  const { data, error } = await admin.auth.admin.generateLink({ type, email })
  const token_hash = data?.properties?.hashed_token
  if (error || !token_hash) return fail()

  const supabase = await createClient()
  const { error: otpError } = await supabase.auth.verifyOtp({ type, token_hash })
  if (otpError) return fail()

  if (link.kind === "login") await admin.from("profiles").update({ must_reset_password: false }).eq("id", link.userId)
  return NextResponse.redirect(new URL(link.kind === "setup" ? "/reset-password" : "/home", request.url), 303)
}
