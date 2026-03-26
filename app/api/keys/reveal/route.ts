import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { decrypt } from "@/lib/encryption"

export async function POST(req: NextRequest) {
  const { id } = await req.json()

  const key = await db.apiKey.findUnique({ where: { id } })
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ value: decrypt(key.keyEncrypted) })
}