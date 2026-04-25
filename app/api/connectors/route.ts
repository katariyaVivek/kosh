import { NextResponse } from "next/server"

import { connectors } from "@/lib/connectors"

export async function GET() {
  return NextResponse.json(
    connectors.map(({ platform, canSync, canValidate, capabilities }) => ({
      platform,
      canSync,
      canValidate,
      capabilities,
    }))
  )
}
