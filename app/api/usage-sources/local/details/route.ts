import { NextResponse } from "next/server"

import { GET as getProviderDetails } from "../[provider]/details/route"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const provider = new URL(request.url).searchParams.get("provider")

  if (!provider) {
    return NextResponse.json({ error: "Provider is required" }, { status: 400 })
  }

  return getProviderDetails(request, {
    params: Promise.resolve({ provider }),
  })
}
