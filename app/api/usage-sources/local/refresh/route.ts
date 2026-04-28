import { NextResponse } from "next/server"

import { importClaudeCodeUsage } from "@/lib/usage/claude-code"
import { importCodexUsage } from "@/lib/usage/codex"
import { importOpenCodeUsage } from "@/lib/usage/opencode"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

async function refreshSource(
  provider: "Claude Code" | "Codex" | "OpenCode",
  importer: () => Promise<{
    filesScanned: number
    entriesScanned: number
    entriesImported: number
  }>
) {
  try {
    const result = await importer()

    return {
      provider,
      success: true,
      ...result,
    }
  } catch (error) {
    return {
      provider,
      success: false,
      error: error instanceof Error ? error.message : "Refresh failed",
    }
  }
}

export async function POST() {
  const [claudeCode, codex, opencode] = await Promise.all([
    refreshSource("Claude Code", () => importClaudeCodeUsage()),
    refreshSource("Codex", () => importCodexUsage()),
    refreshSource("OpenCode", () => importOpenCodeUsage()),
  ])

  return NextResponse.json({
    success: true,
    sources: [claudeCode, codex, opencode],
  })
}
