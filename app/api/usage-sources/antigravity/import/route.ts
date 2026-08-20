import { NextRequest, NextResponse } from "next/server"

import { importAntigravityUsage } from "@/lib/usage/antigravity"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { path?: string }
      | null
    const result = await importAntigravityUsage(body?.path)

    return NextResponse.json({
      success: true,
      filesScanned: result.filesScanned,
      sessionsScanned: result.sessionsScanned,
      entriesScanned: result.entriesScanned,
      entriesImported: result.entriesImported,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Antigravity import failed",
      },
      { status: 400 }
    )
  }
}
