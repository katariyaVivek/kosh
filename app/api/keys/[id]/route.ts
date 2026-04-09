import { NextResponse } from "next/server"

import { db } from "@/lib/db"

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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const existingKey = await db.apiKey.findUnique({
    where: { id },
    select: { id: true },
  })

  if (!existingKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await db.apiKey.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
