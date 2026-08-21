import { NextRequest, NextResponse } from "next/server"

type ImportResult = Record<string, unknown>

/**
 * Factory for POST handlers of /api/usage-sources/<source>/import routes.
 * Each source keeps its own response shape via `pick` and its own error
 * label, so behavior is identical to the previous per-route copies.
 */
export function createImportPost(
  importFn: (path?: string) => Promise<ImportResult>,
  label: string,
  pick: (result: ImportResult) => Record<string, unknown>
) {
  return async function POST(req: NextRequest) {
    try {
      const body = (await req.json().catch(() => null)) as
        | { path?: string }
        | null
      const result = await importFn(body?.path)

      return NextResponse.json({
        success: true,
        ...pick(result),
      })
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : `${label} import failed`,
        },
        { status: 400 }
      )
    }
  }
}
