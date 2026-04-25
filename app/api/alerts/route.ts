import { NextRequest, NextResponse } from "next/server"

import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  const { apiKeyId, usageSourceId, type, threshold } = await req.json()

  if ((!apiKeyId && !usageSourceId) || (apiKeyId && usageSourceId)) {
    return NextResponse.json(
      { error: "Select exactly one alert target" },
      { status: 400 }
    )
  }

  const alert = await db.alert.create({
    data: {
      apiKeyId: apiKeyId || null,
      usageSourceId: usageSourceId || null,
      type,
      threshold: Number(threshold),
    },
  })

  return NextResponse.json(alert)
}
