import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { encrypt } from "@/lib/encryption"
import { getApiKeys, createApiKey } from "@/src/lib/localDb"
import { getConsistentMachineId } from "@/src/shared/utils/machineId"

export const dynamic = "force-dynamic"

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

// GET /api/keys - List Gateway API keys
export async function GET() {
  try {
    const keys = await getApiKeys()
    return NextResponse.json({ keys })
  } catch (error) {
    console.log("Error fetching gateway keys:", error)
    return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 })
  }
}

// POST /api/keys - Handle both Kosh Vault Key creation and Gateway API Key creation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      platform,
      keyValue,
      projectTag,
      environment,
      notes,
      rotationIntervalDays: rawRotationIntervalDays,
      rotationReminderDays: rawRotationReminderDays,
    } = body

    // Gateway API Key generation (when platform / keyValue is not provided)
    if (!platform && !keyValue && name) {
      const machineId = await getConsistentMachineId()
      const apiKey = await createApiKey(name, machineId)
      return NextResponse.json(
        {
          key: apiKey.key,
          name: apiKey.name,
          id: apiKey.id,
          machineId: apiKey.machineId,
        },
        { status: 201 }
      )
    }

    // Kosh Vault Key creation
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
      },
    })

    return NextResponse.json(key)
  } catch (error) {
    console.error("Error creating key:", error)
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 })
  }
}
