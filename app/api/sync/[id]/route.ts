import { NextResponse } from "next/server"

import { getConnector } from "@/lib/connectors"
import type { ConnectorResult, UsageData, UsageFetchResult } from "@/lib/connectors/types"
import { db } from "@/lib/db"
import { decrypt } from "@/lib/encryption"
import { ingestUsage } from "@/lib/usage/ingest"

function normalizeUsageResult(
  result: UsageData[] | UsageFetchResult
): UsageFetchResult {
  if (Array.isArray(result)) {
    return { usage: result }
  }

  return result
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = (await request.json().catch(() => null)) as
      | { action?: string }
      | null
    const action = body?.action ?? "sync"

    const apiKey = await db.apiKey.findUnique({
      where: { id },
      select: {
        id: true,
        platform: true,
        keyEncrypted: true,
      },
    })

    if (!apiKey) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
    }

    const decryptedKey = decrypt(apiKey.keyEncrypted)
    const connector = getConnector(apiKey.platform)

    if (action === "validate") {
      if (!connector.canValidate || !connector.validateKey) {
        return NextResponse.json(
          { success: false, error: "This platform doesn't support validation" },
          { status: 400 }
        )
      }

      const valid = await connector.validateKey(decryptedKey)

      return NextResponse.json({
        success: true,
        valid,
      } satisfies ConnectorResult & { valid: boolean })
    }

    if (action === "sync") {
      if (!connector.canSync || !connector.fetchUsage) {
        return NextResponse.json(
          { success: false, error: "This platform doesn't support auto-sync" },
          { status: 400 }
        )
      }

      const result = normalizeUsageResult(
        await connector.fetchUsage(decryptedKey, 7)
      )

      await ingestUsage({
        source: {
          apiKeyId: apiKey.id,
          name: `${apiKey.platform} provider sync`,
          sourceType: "api_key_provider",
          provider: apiKey.platform,
          collectionMethod: connector.capabilities.collectionMethod,
          accuracy: connector.capabilities.accuracy,
          requiresAdminKey: connector.capabilities.requiresAdminKey,
          privacyNote: connector.capabilities.privacyNote,
          metadata: {
            granularity: connector.capabilities.granularity,
            supportsCost: connector.capabilities.supportsCost,
            supportsTokens: connector.capabilities.supportsTokens,
            supportsModels: connector.capabilities.supportsModels,
          },
        },
        samples: result.usage.map((usage) => ({
          ...usage,
          externalId: `${apiKey.platform}:${apiKey.id}:${usage.date.toISOString().slice(0, 10)}`,
          metadata: result.meta,
        })),
        legacyUsageMode: "upsert",
      })

      return NextResponse.json({
        success: true,
        synced: result.usage.length,
        meta: result.meta,
      } satisfies ConnectorResult)
    }

    return NextResponse.json(
      { success: false, error: "Unknown action" },
      { status: 400 }
    )
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : ""
    const message = rawMessage === "Invalid API key" ? rawMessage : "Sync failed"
    const status = message === "Invalid API key" ? 401 : 500

    return NextResponse.json(
      {
        success: false,
        error: message,
      } satisfies ConnectorResult,
      { status }
    )
  }
}
