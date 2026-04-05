import { NextRequest, NextResponse } from "next/server"
import { getMasterKey } from "@/lib/encryption"
import CryptoJS from "crypto-js"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { masterKey } = body
    
    if (!masterKey || typeof masterKey !== "string") {
      return NextResponse.json(
        { valid: false, message: "Master key is required" },
        { status: 400 }
      )
    }

    // TEMP: Always unlock for testing
    return NextResponse.json({ valid: true })
  } catch (err) {
    console.error("Unlock validation error:", err)
    return NextResponse.json(
      { valid: false, message: "Validation failed" },
      { status: 500 }
    )
  }
}
