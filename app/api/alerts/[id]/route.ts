import { NextResponse } from "next/server"

import { db } from "@/lib/db"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const existingAlert = await db.alert.findUnique({
    where: { id },
    select: { id: true },
  })

  if (!existingAlert) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await db.alert.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
