import { NextRequest, NextResponse } from "next/server"

import { importClaudeCodeUsage } from "@/lib/usage/claude-code"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { path?: string }
      | null
    const result = await importClaudeCodeUsage(body?.path)

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
        error:
          error instanceof Error
            ? error.message
            : "Claude Code import failed",
      },
      { status: 400 }
    )
  }
}
