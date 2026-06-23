import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

const publicPaths = ["/", "/login"]

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic =
    publicPaths.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/images") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/favicon.ico"

  if (isPublic) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoginPage = pathname === "/login"
  const isCoachRoute = pathname.startsWith("/coach")
  const isClientRoute = pathname.startsWith("/client")
  const isProtected = isCoachRoute || isClientRoute

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const role = profile?.role

    if (isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = role === "coach" ? "/coach/dashboard" : "/client/home"
      return NextResponse.redirect(url)
    }

    if (isCoachRoute && role !== "coach") {
      const url = request.nextUrl.clone()
      url.pathname = "/client/home"
      return NextResponse.redirect(url)
    }

    if (isClientRoute && role !== "client") {
      const url = request.nextUrl.clone()
      url.pathname = "/coach/dashboard"
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|images|manifest.json|sw.js).*)",
  ],
}
