import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { encrypt } from "@/lib/encryption"

export async function POST(req: NextRequest) {
  const { name, platform, keyValue, projectTag, environment } = await req.json()

  const key = await db.apiKey.create({
    data: {
      name,
      platform,
      keyEncrypted: encrypt(keyValue),
      projectTag: projectTag || null,
      environment,
    }
  })

  return NextResponse.json(key)
}