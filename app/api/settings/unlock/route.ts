import { NextRequest, NextResponse } from "next/server"
import { getMasterKey } from "@/lib/encryption"

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

    const currentMasterKey = getMasterKey()
    const trimmedKey = masterKey.trim()
    
    if (trimmedKey === currentMasterKey) {
      return NextResponse.json({ valid: true })
    }
    
    return NextResponse.json({ valid: false, message: "Invalid master key" })
  } catch (err) {
    console.error("Unlock validation error:", err)
    return NextResponse.json(
      { valid: false, message: "Validation failed" },
      { status: 500 }
    )
  }
}
