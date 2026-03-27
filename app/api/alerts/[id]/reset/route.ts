import { NextResponse } from "next/server"

import { db } from "@/lib/db"

export async function PATCH(
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

  const alert = await db.alert.update({
    where: { id },
    data: { triggered: false },
  })

  return NextResponse.json(alert)
}
