import { NextRequest, NextResponse } from "next/server"

import { importCodexUsage } from "@/lib/usage/codex"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { path?: string }
      | null
    const result = await importCodexUsage(body?.path)

    return NextResponse.json({
      success: true,
      filesScanned: result.filesScanned,
      entriesScanned: result.entriesScanned,
      entriesImported: result.entriesImported,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Codex import failed",
      },
      { status: 400 }
    )
  }
}
