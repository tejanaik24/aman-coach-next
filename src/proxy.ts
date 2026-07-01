import { updateSession } from "@/lib/supabase/middleware"
import { NextResponse, type NextRequest } from "next/server"

const COACH_PATHS = ["/coach"]
const CLIENT_PATHS = ["/home", "/workout", "/nutrition", "/checkin", "/progress"]

export default async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isCoachPath = COACH_PATHS.some((p) => pathname.startsWith(p))
  const isClientPath = CLIENT_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  )
  const isLoginPath = pathname === "/login"

  // Unauthenticated → redirect to login
  if (!user && (isCoachPath || isClientPath)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Authenticated on login → redirect to role dashboard
  if (user && isLoginPath) {
    const role = user.user_metadata?.role ?? "client"
    const url = request.nextUrl.clone()
    url.pathname = role === "coach" ? "/coach/dashboard" : "/home"
    return NextResponse.redirect(url)
  }

  // Coach trying to access client routes
  if (user && isClientPath && user.user_metadata?.role === "coach") {
    const url = request.nextUrl.clone()
    url.pathname = "/coach/dashboard"
    return NextResponse.redirect(url)
  }

  // Client trying to access coach routes
  if (user && isCoachPath && user.user_metadata?.role !== "coach") {
    const url = request.nextUrl.clone()
    url.pathname = "/home"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|images|manifest.json|sw.js).*)",
  ],
}
