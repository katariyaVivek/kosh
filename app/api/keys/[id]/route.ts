import { NextResponse } from "next/server"

import { db } from "@/lib/db"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { name, platform, projectTag, environment } = await req.json()

  const existingKey = await db.apiKey.findUnique({
    where: { id },
    select: { id: true },
  })

  if (!existingKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const updatedKey = await db.apiKey.update({
    where: { id },
    data: {
      name,
      platform,
      projectTag: projectTag || null,
      environment,
    },
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
