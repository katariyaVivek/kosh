import { NextRequest, NextResponse } from "next/server"

import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  const { apiKeyId, type, threshold } = await req.json()

  const alert = await db.alert.create({
    data: {
      apiKeyId,
      type,
      threshold: Number(threshold),
    },
  })

  return NextResponse.json(alert)
}
