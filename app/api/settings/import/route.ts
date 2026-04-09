import { NextResponse } from "next/server"

import { db } from "@/lib/db"

type ImportedApiKey = {
  name?: string
  platform?: string
  projectTag?: string
  environment?: string
  notes?: string
  expiresAt?: string
  rotationIntervalDays?: number
  rotationReminderDays?: number
  lastRotatedAt?: string
}

function parseOptionalDate(value: string | undefined) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function parseRotationIntervalDays(value: number | undefined) {
  if (value === undefined || value === null) return null
  if (!Number.isInteger(value) || value < 1 || value > 3650) return null
  return value
}

function parseRotationReminderDays(value: number | undefined) {
  if (value === undefined || value === null) return 7
  if (!Number.isInteger(value) || value < 0 || value > 365) return 7
  return value
}

export async function POST(request: Request) {
  const body = await request.text()
  let payload: { keys?: ImportedApiKey[] }

  try {
    payload = JSON.parse(body)
  } catch (error: unknown) {
    console.error("Failed to parse import payload", error)
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

    const rotationIntervalDays = parseRotationIntervalDays(
      rawKey.rotationIntervalDays
    )
    const rotationReminderDays = parseRotationReminderDays(
      rawKey.rotationReminderDays
    )
    const lastRotatedAt = parseOptionalDate(rawKey.lastRotatedAt)

    await db.apiKey.create({
      data: {
        name: rawKey.name,
        platform: rawKey.platform,
        projectTag: rawKey.projectTag ?? null,
        environment: rawKey.environment ?? "production",
        notes: rawKey.notes ?? null,
        expiresAt: parseOptionalDate(rawKey.expiresAt),
        rotationIntervalDays,
        rotationReminderDays,
        lastRotatedAt: rotationIntervalDays ? lastRotatedAt : null,
        keyEncrypted: "",
      },
    })

    seen.add(keySignature)
    imported += 1
  }

  return NextResponse.json({ imported, skipped })
}
