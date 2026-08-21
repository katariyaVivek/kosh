import { importClaudeCodeUsage } from "@/lib/usage/claude-code"
import { createImportPost } from "@/lib/usage/import-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = createImportPost(
  importClaudeCodeUsage,
  "Claude Code",
  (r) => ({
    filesScanned: r.filesScanned,
    entriesScanned: r.entriesScanned,
    entriesImported: r.entriesImported,
  })
)
