import {
  addDays,
  addMonths,
  eachDayOfInterval,
  format,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns"
import { BellRing, DollarSign, Key, Sigma } from "lucide-react"

import { DashboardKeyRow, DashboardKeyTable } from "@/components/dashboard-key-table"
import { DashboardChart } from "@/components/dashboard-chart"
import { KoshShell } from "@/components/kosh-shell"
import { LocalUsageAutoRefresh } from "@/components/local-usage-auto-refresh"
import { LocalSourcePanel } from "@/components/local-source-panel"
import { OnboardingTour } from "@/components/onboarding-tour"
import { Card } from "@/components/ui/card"
import { Sparkline } from "@/components/sparkline"
import { cn } from "@/lib/utils"
import { db } from "@/lib/db"
import { EmptyState } from "@/components/empty-state"

export const dynamic = "force-dynamic"

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
})

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

type LocalUsageStat = {
  provider: string
  tokens: number
  cost: number
  calls: number
  quota?: {
    status: string
    primaryRemainingPercent: number | null
    primaryResetsAt: string | null
    secondaryRemainingPercent: number | null
    secondaryResetsAt: string | null
    fetchedAt: string
  }
}

function parseCostSource(metadataJson: string | null) {
  if (!metadataJson) {
    return "unknown"
  }

  try {
    const metadata = JSON.parse(metadataJson) as { costSource?: string }

    if (
      metadata.costSource === "explicit" ||
      metadata.costSource === "estimated" ||
      metadata.costSource === "unknown"
    ) {
      return metadata.costSource
    }
  } catch {
    return "unknown"
  }

  return "unknown"
}

function toRemainingPercent(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null
  }

  if (value <= 1) {
    return Math.max(0, Math.min(100, value * 100))
  }

  return Math.max(0, Math.min(100, 100 - value))
}

function buildLocalUsageStats(
  entries: Array<{
    provider: string | null
    _sum: {
      totalTokens: number | null
      cost: number | null
      calls: number | null
    }
  }>,
  codexQuota: {
    status: string
    primaryUsedPercent: number | null
    primaryResetsAt: Date | null
    secondaryUsedPercent: number | null
    secondaryResetsAt: Date | null
    fetchedAt: Date
  } | null
): LocalUsageStat[] {
  const byProvider = new Map<string, LocalUsageStat>()

  for (const entry of entries) {
    if (!entry.provider) {
      continue
    }

    byProvider.set(entry.provider, {
      provider: entry.provider,
      tokens: entry._sum.totalTokens ?? 0,
      cost: entry._sum.cost ?? 0,
      calls: entry._sum.calls ?? 0,
    })
  }

  if (codexQuota) {
    const codex = byProvider.get("Codex") ?? {
      provider: "Codex",
      tokens: 0,
      cost: 0,
      calls: 0,
    }

    codex.quota = {
      status: codexQuota.status,
      primaryRemainingPercent: toRemainingPercent(codexQuota.primaryUsedPercent),
      primaryResetsAt: codexQuota.primaryResetsAt?.toISOString() ?? null,
      secondaryRemainingPercent: toRemainingPercent(codexQuota.secondaryUsedPercent),
      secondaryResetsAt: codexQuota.secondaryResetsAt?.toISOString() ?? null,
      fetchedAt: codexQuota.fetchedAt.toISOString(),
    }
    byProvider.set("Codex", codex)
  }

  return ["Claude Code", "Codex", "OpenCode"].map(
    (provider) =>
      byProvider.get(provider) ?? {
        provider,
        tokens: 0,
        cost: 0,
        calls: 0,
      }
  )
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ demo?: string | string[] }>
}) {
  const query = searchParams ? await searchParams : {}
  const demoMode = query.demo === "empty"
  const now = new Date()
  const windowStart = startOfMonth(now)
  const nextMonthStart = addMonths(windowStart, 1)

  const sparklineDateObjects = eachDayOfInterval({
    start: startOfDay(subDays(now, 6)),
    end: startOfDay(now),
  })
  const sparklineStart = sparklineDateObjects[0]
  const sparklineEnd = addDays(startOfDay(now), 1)
  const sparklineDateStrings = sparklineDateObjects.map((d) => format(d, "yyyy-MM-dd"))

  const [
    keys,
    monthlyUsageAggregate,
    monthlyUsageEvents,
    activeAlerts,
    dailyCosts,
    localUsageEntries,
    codexQuotaSnapshot,
  ] =
    demoMode
      ? [
          [],
          { _sum: { cost: 0, totalTokens: 0 } },
          [],
          0,
          [],
          [],
          null,
        ]
      : await Promise.all([
          db.apiKey.findMany({
            orderBy: { createdAt: "desc" },
            include: {
              usageDailyRollups: { orderBy: { rollupDate: "desc" }, take: 1 },
            },
          }),
          db.usageDailyRollup.aggregate({
            _sum: { cost: true, totalTokens: true },
            where: { rollupDate: { gte: windowStart, lt: nextMonthStart } },
          }),
          db.usageEvent.findMany({
            where: { periodStart: { gte: windowStart, lt: nextMonthStart } },
            select: {
              cost: true,
              totalTokens: true,
              metadataJson: true,
            },
          }),
          db.alert.count({ where: { triggered: true } }),
          db.usageDailyRollup.groupBy({
            by: ["rollupDate"],
            _sum: { cost: true },
            where: { rollupDate: { gte: sparklineStart, lt: sparklineEnd } },
          }),
          db.usageDailyRollup.groupBy({
            by: ["provider"],
            _sum: { totalTokens: true, cost: true, calls: true },
            where: {
              rollupDate: { gte: windowStart, lt: nextMonthStart },
              usageSource: {
                sourceType: "local_tool",
              },
            },
          }),
          db.usageQuotaSnapshot.findFirst({
            where: {
              provider: "Codex",
              usageSource: { sourceType: "quota" },
            },
            orderBy: { fetchedAt: "desc" },
            select: {
              status: true,
              primaryUsedPercent: true,
              primaryResetsAt: true,
              secondaryUsedPercent: true,
              secondaryResetsAt: true,
              fetchedAt: true,
            },
          }),
        ])
  const totalKeys = keys.length
  const monthlySpend = monthlyUsageAggregate._sum.cost ?? 0
  const monthlyTokens = monthlyUsageAggregate._sum.totalTokens ?? 0
  const monthlyUnpricedTokens = monthlyUsageEvents.reduce((sum, event) => {
    return parseCostSource(event.metadataJson) === "unknown"
      ? sum + (event.totalTokens ?? 0)
      : sum
  }, 0)
  const monthlyPricedTokens = Math.max(0, monthlyTokens - monthlyUnpricedTokens)
  const hasUnpricedTokens = monthlyUnpricedTokens > 0

  const costByDate = new Map<string, number>()
  for (const entry of dailyCosts) {
    const dateKey = format(entry.rollupDate, "yyyy-MM-dd")
    costByDate.set(dateKey, entry._sum.cost ?? 0)
  }
  const spendSparkline = sparklineDateStrings.map((d) => costByDate.get(d) ?? 0)
  const localUsageStats = buildLocalUsageStats(
    localUsageEntries,
    codexQuotaSnapshot
  )
  const hasUsageData = monthlySpend > 0 || monthlyTokens > 0

  const stats = [
    {
      label: "Active Alerts",
      value: activeAlerts,
      icon: BellRing,
      hasWarning: activeAlerts > 0,
      caption: "Signals requiring review",
      accent: activeAlerts > 0 ? "bg-warning-soft" : "bg-primary/8",
      iconClassName: activeAlerts > 0 ? "text-warning" : "text-muted-foreground",
    },
    {
      label: "Token Usage",
      value: compactNumberFormatter.format(monthlyTokens),
      icon: Sigma,
      caption: hasUnpricedTokens
        ? `${compactNumberFormatter.format(monthlyUnpricedTokens)} unpriced`
        : "Tokens tracked this month",
      accent: "bg-primary/8",
      iconClassName: "text-primary",
    },
    {
      label: "Monthly Spend",
      value: currencyFormatter.format(monthlySpend),
      icon: DollarSign,
      sparkline: spendSparkline,
      caption: hasUnpricedTokens
        ? `${compactNumberFormatter.format(monthlyPricedTokens)} priced tokens`
        : "Tracked this month",
      accent: "bg-primary/8",
      iconClassName: "text-primary",
    },
    {
      label: "Total Keys",
      value: totalKeys,
      icon: Key,
      caption: "Stored credentials",
      accent: "bg-primary/10",
      iconClassName: "text-primary",
    },
  ]

  const tableKeys: DashboardKeyRow[] = keys.map((key) => ({
    id: key.id,
    name: key.name,
    platform: key.platform,
    environment: key.environment,
    lastLog: key.usageDailyRollups[0]?.rollupDate?.toISOString() ?? null,
    expiresAt: key.expiresAt ? key.expiresAt.toISOString() : null,
    createdAt: key.createdAt.toISOString(),
    rotationIntervalDays: key.rotationIntervalDays,
    rotationReminderDays: key.rotationReminderDays,
    lastRotatedAt: key.lastRotatedAt ? key.lastRotatedAt.toISOString() : null,
  }))

  return (
    <KoshShell>
      <LocalUsageAutoRefresh disabled={demoMode} />
      <div data-tour="dashboard" className="flex flex-col gap-4">
        <div className="border-b border-border/70 pb-5">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Credential Overview
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Monitor API key health, rotation status, and usage across environments.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(
            ({ label, value, icon: Icon, sparkline, caption, accent, iconClassName }) => {
              const isWarning =
                label === "Active Alerts" && typeof value === "number" && value > 0

              return (
                <Card
                  key={label}
                  className={cn(
                    "relative min-h-32 overflow-hidden rounded-lg border border-border/80 bg-card/82 p-5 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/25 active:scale-[0.995]",
                    isWarning && "ring-1 ring-warning/40"
                  )}
                >
                  <div className={cn("pointer-events-none absolute inset-0", accent)} />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  <div className="relative flex h-full flex-col justify-between gap-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <p className="text-micro font-medium uppercase text-muted-foreground">
                          {label}
                        </p>
                        <p
                          className={cn(
                            "text-3xl font-semibold tracking-tight tabular-nums",
                            isWarning ? "text-warning" : "text-foreground"
                          )}
                        >
                          {value}
                        </p>
                      </div>
                      <div className="flex size-9 items-center justify-center rounded-lg border border-border/70 bg-background/70">
                        <Icon className={cn("size-4", iconClassName)} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{caption}</p>
                      {sparkline && sparkline.length > 0 && (
                        <div className="mt-3">
                          <Sparkline data={sparkline} color="var(--chart-2)" />
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            }
          )}
        </div>

        <LocalSourcePanel sources={localUsageStats} />

        {hasUsageData ? <DashboardChart /> : null}

        {tableKeys.length === 0 ? (
          <EmptyState />
        ) : (
          <DashboardKeyTable keys={tableKeys} />
        )}
      </div>
      <div data-tour="shortcuts" className="sr-only" />
      <OnboardingTour />
    </KoshShell>
  )
}
