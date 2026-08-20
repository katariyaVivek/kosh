import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { deleteApiKey, getApiKeyById, updateApiKey } from "@/src/lib/localDb"

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

// GET /api/keys/[id] - Get Gateway or Vault Key
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const gatewayKey = await getApiKeyById(id)
    if (gatewayKey) {
      return NextResponse.json({ key: gatewayKey })
    }

    const vaultKey = await db.apiKey.findUnique({
      where: { id },
    })
    if (!vaultKey) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 })
    }
    return NextResponse.json({ key: vaultKey })
  } catch (error) {
    console.error("Error fetching key:", error)
    return NextResponse.json({ error: "Failed to fetch key" }, { status: 500 })
  }
}

// PUT /api/keys/[id] - Update Gateway key
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { isActive } = body

    const existing = await getApiKeyById(id)
    if (!existing) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 })
    }

    const updateData: { isActive?: boolean } = {}
    if (isActive !== undefined) updateData.isActive = isActive

    const updated = await updateApiKey(id, updateData)
    return NextResponse.json({ key: updated })
  } catch (error) {
    console.error("Error updating gateway key:", error)
    return NextResponse.json({ error: "Failed to update key" }, { status: 500 })
  }
}

// PATCH /api/keys/[id] - Update Kosh vault key metadata
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { name, platform, projectTag, environment, notes, markRotatedNow } = body

  const hasRotationIntervalDays = Object.prototype.hasOwnProperty.call(
    body,
    "rotationIntervalDays"
  )
  const hasRotationReminderDays = Object.prototype.hasOwnProperty.call(
    body,
    "rotationReminderDays"
  )

  const existingKey = await db.apiKey.findUnique({
    where: { id },
    select: {
      id: true,
      rotationIntervalDays: true,
      lastRotatedAt: true,
      rotationReminderDays: true,
    },
  })

  if (!existingKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let rotationIntervalDays = existingKey.rotationIntervalDays
  let rotationReminderDays = existingKey.rotationReminderDays

  try {
    if (hasRotationIntervalDays) {
      rotationIntervalDays = parseRotationIntervalDays(body.rotationIntervalDays)
    }

    if (hasRotationReminderDays) {
      rotationReminderDays = parseRotationReminderDays(body.rotationReminderDays)
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "rotation_payload_invalid"

    return NextResponse.json(
      { error: message, message: "Invalid rotation reminder settings." },
      { status: 400 }
    )
  }

  const shouldMarkRotatedNow = markRotatedNow === true
  const data: {
    name: string
    platform: string
    projectTag: string | null
    environment: string
    notes: string | null
    rotationIntervalDays: number | null
    rotationReminderDays: number
    lastRotatedAt?: Date | null
  } = {
    name,
    platform,
    projectTag: projectTag || null,
    environment,
    notes: notes || null,
    rotationIntervalDays,
    rotationReminderDays,
  }

  if (rotationIntervalDays === null) {
    data.lastRotatedAt = null
  } else if (
    shouldMarkRotatedNow ||
    (hasRotationIntervalDays &&
      existingKey.rotationIntervalDays === null &&
      existingKey.lastRotatedAt === null)
  ) {
    data.lastRotatedAt = new Date()
  }

  const updatedKey = await db.apiKey.update({
    where: { id },
    data,
  })

  return NextResponse.json(updatedKey)
}

// DELETE /api/keys/[id] - Delete key (vault key or gateway key)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Try Kosh vault key first
  const existingVaultKey = await db.apiKey.findUnique({
    where: { id },
    select: { id: true },
  })

  if (existingVaultKey) {
    await db.apiKey.delete({
      where: { id },
    })
    return NextResponse.json({ success: true, message: "Vault key deleted" })
  }

  // Try Gateway key
  const deletedGatewayKey = await deleteApiKey(id)
  if (deletedGatewayKey) {
    return NextResponse.json({ success: true, message: "Gateway key deleted successfully" })
  }

  return NextResponse.json({ error: "Key not found" }, { status: 404 })
}
