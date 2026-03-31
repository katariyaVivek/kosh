import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const masterKey = process.env.KOSH_MASTER_KEY
  const isSetupRequired =
    !masterKey ||
    masterKey.includes("change-this") ||
    masterKey.includes("super-secret") ||
    masterKey.length < 32

  const isSetupPage = request.nextUrl.pathname === "/setup"
  const isApiRoute = request.nextUrl.pathname.startsWith("/api")

  if (isSetupRequired && !isSetupPage && !isApiRoute) {
    return NextResponse.redirect(new URL("/setup", request.url))
  }
  if (!isSetupRequired && isSetupPage) {
    return NextResponse.redirect(new URL("/", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
