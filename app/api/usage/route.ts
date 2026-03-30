import { NextRequest, NextResponse } from "next/server"

import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  const { apiKeyId, calls, cost, tokens } = await req.json()

  const usageLog = await db.usageLog.create({
    data: {
      apiKeyId,
      calls: Number(calls),
      cost: Number(cost),
      tokens: tokens === null || tokens === "" ? null : Number(tokens),
      date: new Date(),
    },
  })

  return NextResponse.json(usageLog)
}
