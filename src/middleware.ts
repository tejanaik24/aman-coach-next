import { NextResponse, type NextRequest } from "next/server"

// Runs on Edge Runtime — zero network calls, zero async, instant
export function middleware(request: NextRequest) {
  const projectRef = "muuegtbyaehlrfqjluqz"
  const cookieName = `sb-${projectRef}-auth-token`

  const hasSession =
    request.cookies.has(cookieName) ||
    request.cookies.has(`${cookieName}.0`) ||
    request.cookies.has(`${cookieName}.1`)

  if (!hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/coach/:path*", "/client/:path*"],
}
