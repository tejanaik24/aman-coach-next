import { updateSession } from "@/lib/supabase/middleware"
import { NextResponse, type NextRequest } from "next/server"

const COACH_PATHS = ["/dashboard", "/clients", "/checkins", "/plans", "/fees", "/coach/schedule", "/submissions"]
const CLIENT_PATHS = ["/home", "/workout", "/nutrition", "/checkin", "/progress", "/diet", "/schedule", "/onboarding"]

async function getRole(supabase: ReturnType<typeof import("@supabase/ssr").createServerClient>, userId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single()
  return data?.role ?? "client"
}

async function getMustReset(supabase: ReturnType<typeof import("@supabase/ssr").createServerClient>, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("must_reset_password")
    .eq("id", userId)
    .single()
  return data?.must_reset_password === true
}

export default async function proxy(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isCoachPath = COACH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  const isClientPath = CLIENT_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  const isLoginPath = pathname === "/login"
  const isResetPath = pathname === "/reset-password"

  // Unauthenticated → redirect to login
  if (!user && (isCoachPath || isClientPath || isResetPath)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Authenticated on login page → redirect based on profiles table role
  if (user && isLoginPath) {
    const role = await getRole(supabase, user.id)
    const mustReset = await getMustReset(supabase, user.id)
    const url = request.nextUrl.clone()
    if (mustReset) { url.pathname = "/reset-password"; return NextResponse.redirect(url) }
    if (role === "coach") url.pathname = "/dashboard"
    else if (role === "client") url.pathname = "/home"
    else url.pathname = "/onboarding"
    return NextResponse.redirect(url)
  }

  // Authenticated but must reset password → force redirect (except on reset page itself)
  if (user && !isResetPath && !isLoginPath) {
    const mustReset = await getMustReset(supabase, user.id)
    if (mustReset) {
      const url = request.nextUrl.clone()
      url.pathname = "/reset-password"
      return NextResponse.redirect(url)
    }
  }

  // Role-based route protection using profiles table
  if (user) {
    const role = await getRole(supabase, user.id)

    if (isClientPath && role === "coach") {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }

    if (isCoachPath && role !== "coach") {
      const url = request.nextUrl.clone()
      url.pathname = "/home"
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|images|manifest.json|sw.js|css|js).*)",
  ],
}
