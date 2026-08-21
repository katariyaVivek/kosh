import { importAntigravityUsage } from "@/lib/usage/antigravity"
import { createImportPost } from "@/lib/usage/import-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = createImportPost(
  importAntigravityUsage,
  "Antigravity",
  (r) => ({
    filesScanned: r.filesScanned,
    sessionsScanned: r.sessionsScanned,
    entriesScanned: r.entriesScanned,
    entriesImported: r.entriesImported,
  })
)
