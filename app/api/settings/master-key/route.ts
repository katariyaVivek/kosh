import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  validateMasterKey,
  getMasterKey,
  setMasterKeyFile,
  encryptWithKey,
  decryptWithKey,
} from "@/lib/encryption"

export async function POST(req: NextRequest) {
  try {
    const { newMasterKey } = await req.json()

    if (!newMasterKey || typeof newMasterKey !== "string") {
      return NextResponse.json(
        { error: "invalid_key", message: "New master key is required" },
        { status: 400 }
      )
    }

    if (!validateMasterKey(newMasterKey)) {
      return NextResponse.json(
        {
          error: "invalid_key",
          message: `Master key must be at least 12 characters`,
        },
        { status: 400 }
      )
    }

    const oldMasterKey = getMasterKey()

    const allKeys = await db.apiKey.findMany()

    for (const apiKey of allKeys) {
      try {
        const decrypted = decryptWithKey(apiKey.keyEncrypted, oldMasterKey)
        
        if (!decrypted) {
          throw new Error("Decryption resulted in empty string")
        }
        
        const reEncrypted = encryptWithKey(decrypted, newMasterKey)

        await db.apiKey.update({
          where: { id: apiKey.id },
          data: { keyEncrypted: reEncrypted },
        })
      } catch (err) {
        console.error(`Failed to rotate key ${apiKey.id}:`, err)
        return NextResponse.json(
          {
            error: "rotation_failed",
            message: `Failed to rotate key "${apiKey.name}". Your current master key may be incorrect.`,
          },
          { status: 500 }
        )
      }
    }

    setMasterKeyFile(newMasterKey)

    return NextResponse.json({
      success: true,
      rotatedCount: allKeys.length,
    })
  } catch (err: unknown) {
    console.error("Master key rotation error:", err)
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json(
      { error: "rotation_failed", message },
      { status: 500 }
    )
  }
}
