import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { encrypt } from "@/lib/encryption"

function parseRotationIntervalDays(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 3650) {
    throw new Error("rotation_interval_invalid")
  }

  return value
}

function parseRotationReminderDays(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return 7
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 365) {
    throw new Error("rotation_reminder_invalid")
  }

  return value
}

export async function POST(req: NextRequest) {
  const {
    name,
    platform,
    keyValue,
    projectTag,
    environment,
    notes,
    rotationIntervalDays: rawRotationIntervalDays,
    rotationReminderDays: rawRotationReminderDays,
  } = await req.json()

  let rotationIntervalDays: number | null
  let rotationReminderDays: number

  try {
    rotationIntervalDays = parseRotationIntervalDays(rawRotationIntervalDays)
    rotationReminderDays = parseRotationReminderDays(rawRotationReminderDays)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "rotation_payload_invalid"

    return NextResponse.json(
      { error: message, message: "Invalid rotation reminder settings." },
      { status: 400 }
    )
  }

  const key = await db.apiKey.create({
    data: {
      name,
      platform,
      keyEncrypted: encrypt(keyValue),
      projectTag: projectTag || null,
      environment,
      notes: notes || null,
      rotationIntervalDays,
      rotationReminderDays,
      lastRotatedAt: rotationIntervalDays ? new Date() : null,
    }
  })

  return NextResponse.json(key)
}
