import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { isSetupRequired as shouldShowSetup } from "@/lib/setup"

export function proxy(request: NextRequest) {
  const isSetupPage = request.nextUrl.pathname === "/setup"
  const isApiRoute = request.nextUrl.pathname.startsWith("/api")

  if (shouldShowSetup() && !isSetupPage && !isApiRoute) {
    return NextResponse.redirect(new URL("/setup", request.url))
  }
  if (!shouldShowSetup() && isSetupPage) {
    return NextResponse.redirect(new URL("/", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
