import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE, isSessionUserId } from "@/lib/auth"

/**
 * Mock route protection: pages need the demo session cookie; /login bounces
 * signed-in users to the app. Module-level access is enforced client-side
 * (AccessGuard) because grants live in the browser for now.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const signedIn = isSessionUserId(request.cookies.get(SESSION_COOKIE)?.value)

  if (pathname === "/login") {
    return signedIn ? NextResponse.redirect(new URL(request.nextUrl.searchParams.get("next") ?? "/dashboard", request.url)) : NextResponse.next()
  }
  if (!signedIn) {
    const url = new URL("/login", request.url)
    if (pathname !== "/") url.searchParams.set("next", pathname + search)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  // Everything except Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
