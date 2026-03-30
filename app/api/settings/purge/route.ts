import { NextResponse } from "next/server"

import { db } from "@/lib/db"

export async function DELETE() {
  await db.usageLog.deleteMany()
  await db.alert.deleteMany()
  await db.apiKey.deleteMany()
  return NextResponse.json({ success: true })
}
