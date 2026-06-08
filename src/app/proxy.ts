// Next.js 16 auth proxy
// Placeholder for Firebase auth middleware
// When Firebase is set up, this will check auth state and redirect accordingly

import { NextRequest, NextResponse } from "next/server"

const publicPaths = [
  "/",
  "/about",
  "/services",
  "/contact",
  "/transformations",
  "/auth/login",
  "/auth/signup",
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith("/_next") || pathname.startsWith("/images")
  )

  if (isPublic) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json).*)"],
}
