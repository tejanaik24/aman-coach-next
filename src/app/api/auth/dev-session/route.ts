import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function GET(req: Request) {
  const url = new URL(req.url)
  // Only allow on localhost
  if (!url.hostname.includes("localhost") && !url.hostname.includes("127.0.0.1")) {
    return NextResponse.json({ error: "Local only" }, { status: 403 })
  }

  const next = url.searchParams.get("next") || "/dashboard"
  const redirectUrl = new URL(next, req.url)
  let response = NextResponse.redirect(redirectUrl)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookieHeader = req.headers.get("cookie") || ""
          return cookieHeader.split(";").map((c) => {
            const [name, ...v] = c.trim().split("=")
            return { name, value: v.join("=") }
          }).filter((c) => c.name)
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const email = process.env.SETUP_COACH_EMAIL || "amankhuranafitness@gmail.com"
  const password = process.env.SETUP_COACH_PASSWORD || "AmanCoach@2026"
  await supabase.auth.signInWithPassword({ email, password })

  return response
}
