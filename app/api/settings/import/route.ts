import { NextResponse } from "next/server"

import { db } from "@/lib/db"

export async function POST(request: Request) {
  const body = await request.text()
  let payload: { keys?: Array<Record<string, any>> }

  try {
    payload = JSON.parse(body)
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!payload.keys || !Array.isArray(payload.keys)) {
    return NextResponse.json({ error: "Missing keys array" }, { status: 400 })
  }

  const existing = await db.apiKey.findMany({
    select: { name: true, platform: true },
  })
  const seen = new Set(existing.map((item) => `${item.name}:${item.platform}`))

  let imported = 0
  let skipped = 0

  for (const rawKey of payload.keys) {
    if (!rawKey?.name || !rawKey?.platform) {
      skipped += 1
      continue
    }

    const keySignature = `${rawKey.name}:${rawKey.platform}`

    if (seen.has(keySignature)) {
      skipped += 1
      continue
    }

    await db.apiKey.create({
      data: {
        name: rawKey.name,
        platform: rawKey.platform,
        projectTag: rawKey.projectTag ?? null,
        environment: rawKey.environment ?? "production",
        notes: rawKey.notes ?? null,
        expiresAt: rawKey.expiresAt ? new Date(rawKey.expiresAt) : null,
        keyEncrypted: "",
      },
    })

    seen.add(keySignature)
    imported += 1
  }

  return NextResponse.json({ imported, skipped })
}
