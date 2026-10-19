import { updateSession } from "@/lib/supabase/middleware"
import { NextResponse, type NextRequest } from "next/server"

const COACH_PATHS = ["/dashboard", "/clients", "/checkins", "/plans", "/fees", "/coach/schedule", "/submissions", "/messages"]
const CLIENT_PATHS = ["/home", "/more", "/workout", "/nutrition", "/checkin", "/progress", "/diet", "/schedule", "/onboarding", "/payments"]

interface ProfileAuthData {
  role: string
  mustReset: boolean
}

async function getProfileAuthData(
  supabase: ReturnType<typeof import("@supabase/ssr").createServerClient>,
  userId: string
): Promise<ProfileAuthData> {
  const { data } = await supabase
    .from("profiles")
    .select("role, must_reset_password")
    .eq("id", userId)
    .single()
  return {
    role: data?.role ?? "client",
    mustReset: data?.must_reset_password === true,
  }
}

export default async function proxy(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isCoachPath = COACH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  const isClientPath = CLIENT_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  const isLoginPath = pathname === "/login"
  const isResetPath = pathname === "/reset-password"

  // Unauthenticated → redirect to login
  if (!user && (isCoachPath || isClientPath)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Only run profile read for coach, client, or login paths (not public pages, not /api)
  const needsProfileRead = Boolean(user && (isCoachPath || isClientPath || isLoginPath))
  const profile = needsProfileRead ? await getProfileAuthData(supabase, user!.id) : null

  // Authenticated on login page → redirect based on profiles table role
  if (user && isLoginPath && profile) {
    const url = request.nextUrl.clone()
    if (profile.mustReset) { url.pathname = "/reset-password"; return NextResponse.redirect(url) }
    if (profile.role === "coach") url.pathname = "/dashboard"
    else if (profile.role === "client") url.pathname = "/home"
    else url.pathname = "/onboarding"
    return NextResponse.redirect(url)
  }

  // Authenticated but must reset password → force redirect (except on reset page itself)
  if (user && !isResetPath && !isLoginPath && profile?.mustReset) {
    const url = request.nextUrl.clone()
    url.pathname = "/reset-password"
    return NextResponse.redirect(url)
  }

  // Role-based route protection using profiles table
  if (user && profile) {
    if (isClientPath && profile.role === "coach") {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }

    if (isCoachPath && profile.role !== "coach") {
      const url = request.nextUrl.clone()
      url.pathname = "/home"
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|images|manifest.json|sw.js|css|js|.*\\.(?:png|svg|jpg|jpeg|webp|mp4|html)$).*)",
  ],
}
