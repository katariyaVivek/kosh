import { importCodexUsage } from "@/lib/usage/codex"
import { createImportPost } from "@/lib/usage/import-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = createImportPost(importCodexUsage, "Codex", (r) => ({
  filesScanned: r.filesScanned,
  entriesScanned: r.entriesScanned,
  entriesImported: r.entriesImported,
  analyzer: r.analyzer,
  analyzerStatus: r.analyzerStatus,
  analyzerError: r.analyzerError,
}))
