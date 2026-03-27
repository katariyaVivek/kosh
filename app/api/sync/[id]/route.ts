import { NextResponse } from "next/server"

import { getConnector } from "@/lib/connectors"
import type { ConnectorResult, UsageData, UsageFetchResult } from "@/lib/connectors/types"
import { db } from "@/lib/db"
import { decrypt } from "@/lib/encryption"

function getUtcDayBounds(date: Date) {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()

  return {
    start: new Date(Date.UTC(year, month, day, 0, 0, 0, 0)),
    noon: new Date(Date.UTC(year, month, day, 12, 0, 0, 0)),
    end: new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0)),
  }
}

async function upsertUsageLog(apiKeyId: string, usage: UsageData) {
  const { start, noon, end } = getUtcDayBounds(usage.date)
  const now = new Date()
  const todayBounds = getUtcDayBounds(now)
  const logDate =
    usage.date >= todayBounds.start && usage.date < todayBounds.end ? now : noon

  const existingLog = await db.usageLog.findFirst({
    where: {
      apiKeyId,
      date: {
        gte: start,
        lt: end,
      },
    },
    select: { id: true },
  })

  if (existingLog) {
    await db.usageLog.update({
      where: { id: existingLog.id },
      data: {
        calls: usage.calls,
        cost: usage.cost,
        tokens: usage.tokens ?? null,
        date: logDate,
      },
    })

    return
  }

  await db.usageLog.create({
    data: {
      apiKeyId,
      calls: usage.calls,
      cost: usage.cost,
      tokens: usage.tokens ?? null,
      date: logDate,
    },
  })
}

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

      for (const usage of result.usage) {
        await upsertUsageLog(apiKey.id, usage)
      }

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
