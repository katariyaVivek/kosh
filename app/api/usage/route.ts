import { NextRequest, NextResponse } from "next/server"

import { db } from "@/lib/db"
import { ingestUsage } from "@/lib/usage/ingest"

export async function POST(req: NextRequest) {
  const { apiKeyId, calls, cost, tokens } = await req.json()
  const apiKey = await db.apiKey.findUnique({
    where: { id: apiKeyId },
    select: { id: true, name: true, platform: true },
  })

  if (!apiKey) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 })
  }

  const { usageSource } = await ingestUsage({
    source: {
      apiKeyId: apiKey.id,
      name: `${apiKey.name} manual entries`,
      sourceType: "manual_entry",
      provider: apiKey.platform,
      collectionMethod: "manual",
      accuracy: "manual",
      privacyNote: "Usage is based on values entered manually.",
    },
    samples: [
      {
        externalId: `manual:${apiKey.id}:${Date.now()}`,
        date: new Date(),
        calls: Number(calls),
        cost: Number(cost),
        tokens: tokens === null || tokens === "" ? null : Number(tokens),
      },
    ],
    legacyUsageMode: "create",
  })

  return NextResponse.json({ success: true, usageSourceId: usageSource.id })
}
