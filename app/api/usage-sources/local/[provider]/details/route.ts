import { addDays, format, startOfDay, subDays } from "date-fns"
import { NextResponse } from "next/server"

import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

function parseMetadata(metadataJson: string | null) {
  if (!metadataJson) {
    return null
  }

  try {
    return JSON.parse(metadataJson) as {
      filesScanned?: number
      entriesScanned?: number
      entriesImported?: number
      lastImportedAt?: string
    }
  } catch {
    return null
  }
}

function parseCostSource(metadataJson: string | null) {
  if (!metadataJson) {
    return null
  }

  try {
    const metadata = JSON.parse(metadataJson) as {
      costSource?: string
    }

    if (metadata.costSource === "explicit" || metadata.costSource === "estimated") {
      return metadata.costSource
    }
  } catch {
    return null
  }

  return null
}

function getResetDate(value: Date | null, fetchedAt: Date) {
  if (!value) {
    return null
  }

  if (value.getFullYear() >= 2024) {
    return value.toISOString()
  }

  const secondsFromNow = Math.round(value.getTime() / 1000)
  if (secondsFromNow <= 0) {
    return null
  }

  const date = new Date(fetchedAt.getTime() + secondsFromNow * 1000)
  return date.toISOString()
}

function toRemainingPercent(value: number | null, sourceLabel: string) {
  if (value === null) {
    return null
  }

  if (sourceLabel === "codex-oauth") {
    return Math.max(0, Math.min(100, 100 - value))
  }

  return value
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: encodedProvider } = await params
  const provider = decodeURIComponent(encodedProvider)

  if (!provider) {
    return NextResponse.json({ error: "Provider is required" }, { status: 400 })
  }

  const now = new Date()
  const today = startOfDay(now)
  const rangeStart = subDays(today, 29)
  const rangeEnd = addDays(today, 1)

  const source = await db.usageSource.findFirst({
    where: {
      sourceType: "local_tool",
      provider,
    },
    orderBy: { updatedAt: "desc" },
  })

  const [totals, dailyRollups, latestEvents, modelBreakdown, quotaSnapshot, costSourceEvents] = await Promise.all([
    db.usageDailyRollup.aggregate({
      _sum: { totalTokens: true, cost: true, calls: true },
      where: {
        provider,
        usageSource: { sourceType: "local_tool" },
      },
    }),
    db.usageDailyRollup.findMany({
      where: {
        provider,
        rollupDate: { gte: rangeStart, lt: rangeEnd },
        usageSource: { sourceType: "local_tool" },
      },
      orderBy: { rollupDate: "asc" },
    }),
    db.usageEvent.findMany({
      where: {
        provider,
        sourceType: "local_tool",
      },
      orderBy: { periodStart: "desc" },
      take: 8,
      select: {
        id: true,
        model: true,
        calls: true,
        totalTokens: true,
        cost: true,
        periodStart: true,
        accuracy: true,
        metadataJson: true,
      },
    }),
    db.usageEvent.groupBy({
      by: ["model"],
      _sum: { totalTokens: true, cost: true, calls: true },
      where: {
        provider,
        sourceType: "local_tool",
      },
      orderBy: {
        _sum: {
          totalTokens: "desc",
        },
      },
      take: 6,
    }),
    db.usageQuotaSnapshot.findFirst({
      where: {
        provider,
        usageSource: { sourceType: "quota" },
      },
      orderBy: { fetchedAt: "desc" },
    }),
    db.usageEvent.findMany({
      where: {
        provider,
        sourceType: "local_tool",
      },
      select: {
        metadataJson: true,
      },
    }),
  ])

  const costSourceCounts = costSourceEvents.reduce(
    (acc, event) => {
      const costSource = parseCostSource(event.metadataJson)

      if (costSource === "explicit") {
        acc.explicit += 1
      } else if (costSource === "estimated") {
        acc.estimated += 1
      } else {
        acc.unknown += 1
      }

      return acc
    },
    { explicit: 0, estimated: 0, unknown: 0 }
  )

  const costSourceMode =
    costSourceCounts.explicit > 0 && costSourceCounts.estimated > 0
      ? "mixed"
      : costSourceCounts.explicit > 0
        ? "explicit"
        : costSourceCounts.estimated > 0
          ? "estimated"
          : "unknown"

  return NextResponse.json({
    provider,
    source: source
      ? {
          id: source.id,
          collectionMethod: source.collectionMethod,
          accuracy: source.accuracy,
          costSource: {
            mode: costSourceMode,
            explicitCount: costSourceCounts.explicit,
            estimatedCount: costSourceCounts.estimated,
            unknownCount: costSourceCounts.unknown,
            totalCount:
              costSourceCounts.explicit +
              costSourceCounts.estimated +
              costSourceCounts.unknown,
          },
          privacyNote: source.privacyNote,
          importStats: parseMetadata(source.metadataJson),
          updatedAt: source.updatedAt.toISOString(),
        }
      : null,
    quota: quotaSnapshot
      ? {
          status: quotaSnapshot.status,
          sourceLabel: quotaSnapshot.sourceLabel,
          accountEmail: quotaSnapshot.accountEmail,
          accountPlan: quotaSnapshot.accountPlan,
          primary: {
            usedPercent: quotaSnapshot.primaryUsedPercent,
            remainingPercent: toRemainingPercent(
              quotaSnapshot.primaryUsedPercent,
              quotaSnapshot.sourceLabel
            ),
            windowMinutes: quotaSnapshot.primaryWindowMinutes,
            resetsAt: getResetDate(
              quotaSnapshot.primaryResetsAt,
              quotaSnapshot.fetchedAt
            ),
            resetDescription: quotaSnapshot.primaryResetDescription,
          },
          secondary: {
            usedPercent: quotaSnapshot.secondaryUsedPercent,
            remainingPercent: toRemainingPercent(
              quotaSnapshot.secondaryUsedPercent,
              quotaSnapshot.sourceLabel
            ),
            windowMinutes: quotaSnapshot.secondaryWindowMinutes,
            resetsAt: getResetDate(
              quotaSnapshot.secondaryResetsAt,
              quotaSnapshot.fetchedAt
            ),
            resetDescription: quotaSnapshot.secondaryResetDescription,
          },
          creditsRemaining: quotaSnapshot.creditsRemaining,
          hasCredits: quotaSnapshot.hasCredits,
          unlimited: quotaSnapshot.unlimited,
          error: quotaSnapshot.error,
          fetchedAt: quotaSnapshot.fetchedAt.toISOString(),
        }
      : null,
    totals: {
      tokens: totals._sum.totalTokens ?? 0,
      cost: totals._sum.cost ?? 0,
      calls: totals._sum.calls ?? 0,
    },
    dailyRollups: dailyRollups.map((rollup) => ({
      id: rollup.id,
      date: format(rollup.rollupDate, "yyyy-MM-dd"),
      tokens: rollup.totalTokens ?? 0,
      cost: rollup.cost,
      calls: rollup.calls,
      accuracy: rollup.accuracy,
    })),
    latestEvents: latestEvents.map((event) => ({
      id: event.id,
      model: event.model ?? provider,
      calls: event.calls,
      tokens: event.totalTokens ?? 0,
      cost: event.cost,
      date: event.periodStart.toISOString(),
      accuracy: event.accuracy,
      costSource: parseCostSource(event.metadataJson) ?? "unknown",
    })),
    modelBreakdown: modelBreakdown.map((entry) => ({
      model: entry.model ?? provider,
      tokens: entry._sum.totalTokens ?? 0,
      cost: entry._sum.cost ?? 0,
      calls: entry._sum.calls ?? 0,
    })),
  })
}
