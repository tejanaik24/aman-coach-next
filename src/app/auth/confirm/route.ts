import { type EmailOtpType } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// One-time sign-in / password links land here.
// GET only shows a "Continue" button. The token is used up on POST, when a person taps it.
// Why: WhatsApp (and other chat apps) open every link in a message to build a preview. If GET used
// the token, that preview would burn it and the client would see "link expired".

// Only same-site paths. Browsers treat "/\evil.com" or "/\t/evil.com" as another site, so resolve and compare origins.
function safeNext(nextParam: string | null | undefined): string {
  if (!nextParam || !nextParam.startsWith("/") || /[\\\s\u0000-\u001f]/.test(nextParam)) return "/login"
  try {
    const base = "https://same.invalid"
    const u = new URL(nextParam, base)
    return u.origin === base ? u.pathname + u.search : "/login"
  } catch {
    return "/login"
  }
}

function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  if (!token_hash || !type) {
    return NextResponse.redirect(new URL("/login?error=link_expired", request.url))
  }
  const next = safeNext(searchParams.get("next"))

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Aman Khurana Fitness</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#000;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:24px}
.card{max-width:340px}h1{font-size:22px;margin:0 0 8px}p{color:#a1a1aa;margin:0 0 24px;font-size:15px}
button{width:100%;height:52px;border:0;border-radius:999px;background:#f5b400;color:#000;font-size:16px;font-weight:700;cursor:pointer}
</style></head><body><form class="card" method="post" action="/auth/confirm">
<h1>Aman Khurana Fitness</h1><p>Tap the button to open your app.</p>
<input type="hidden" name="token_hash" value="${esc(token_hash)}">
<input type="hidden" name="type" value="${esc(type)}">
<input type="hidden" name="next" value="${esc(next)}">
<button type="submit">Open my app</button></form></body></html>`

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  })
}

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const token_hash = String(form.get("token_hash") ?? "")
  const type = String(form.get("type") ?? "") as EmailOtpType
  const next = safeNext(String(form.get("next") ?? ""))

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      // 303 turns the POST into a normal GET on the next page
      return NextResponse.redirect(new URL(next, request.url), 303)
    }
  }

  return NextResponse.redirect(new URL("/login?error=link_expired", request.url), 303)
}
