import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { getConnector } from "@/lib/connectors"

export type HealthCheckResult = {
  id: string
  name: string
  platform: string
  valid: boolean | null
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const keys = await db.apiKey.findMany({ select: { id: true, name: true, platform: true } })
    const results: HealthCheckResult[] = []
    for (const key of keys) {
      const connector = getConnector(key.platform)
      if (!connector.canValidate) {
        results.push({ id: key.id, name: key.name, platform: key.platform, valid: null })
        continue
      }
      try {
        const url = new URL(`/api/sync/${key.id}`, request.url)
        const res = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "validate" }),
        })
        if (!res.ok) {
          const text = await res.text().catch(() => res.statusText)
          results.push({ id: key.id, name: key.name, platform: key.platform, valid: false, error: text })
        } else {
          const data = await res.json()
          results.push({ id: key.id, name: key.name, platform: key.platform, valid: data.valid ?? false, error: data.error })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Validation failed"
        results.push({ id: key.id, name: key.name, platform: key.platform, valid: false, error: message })
      }
    }
    return NextResponse.json(results)
  } catch {
    return NextResponse.json({ error: "Health check failed" }, { status: 500 })
  }
}
