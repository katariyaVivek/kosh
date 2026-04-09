import { NextResponse } from "next/server"

import { db } from "@/lib/db"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const existingKey = await db.apiKey.findUnique({
    where: { id },
    select: {
      id: true,
      rotationIntervalDays: true,
    },
  })

  if (!existingKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (!existingKey.rotationIntervalDays) {
    return NextResponse.json(
      { error: "rotation_not_configured", message: "Rotation reminders are not enabled for this key." },
      { status: 400 }
    )
  }

  const updated = await db.apiKey.update({
    where: { id },
    data: {
      lastRotatedAt: new Date(),
    },
    select: {
      id: true,
      lastRotatedAt: true,
    },
  })

  return NextResponse.json(updated)
}
