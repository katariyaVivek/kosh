"use client"

import { useEffect, useMemo, useState } from "react"
import { X } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type LocalUsageStat = {
  provider: string
  tokens: number
  cost: number
  calls: number
}

type LocalSourceDetails = {
  provider: string
  source: {
    collectionMethod: string
    accuracy: string
    costSource: {
      mode: string
      explicitCount: number
      estimatedCount: number
      unknownCount: number
      totalCount: number
    }
    privacyNote: string | null
    importStats: {
      filesScanned?: number
      entriesScanned?: number
      entriesImported?: number
      lastImportedAt?: string
    } | null
    updatedAt: string
  } | null
  quota: {
    status: string
    sourceLabel: string
    accountEmail: string | null
    accountPlan: string | null
    primary: {
      usedPercent: number | null
      remainingPercent: number | null
      windowMinutes: number | null
      resetsAt: string | null
      resetDescription: string | null
    }
    secondary: {
      usedPercent: number | null
      remainingPercent: number | null
      windowMinutes: number | null
      resetsAt: string | null
      resetDescription: string | null
    }
    creditsRemaining: number | null
    hasCredits: boolean | null
    unlimited: boolean | null
    error: string | null
    fetchedAt: string
  } | null
  totals: {
    tokens: number
    cost: number
    calls: number
  }
  dailyRollups: Array<{
    id: string
    date: string
    tokens: number
    cost: number
    calls: number
    accuracy: string
  }>
  latestEvents: Array<{
    id: string
    model: string
    calls: number
    tokens: number
    cost: number
    date: string
    accuracy: string
    costSource: string
  }>
  modelBreakdown: Array<{
    model: string
    tokens: number
    cost: number
    calls: number
  }>
}

type LocalSourcePanelProps = {
  sources: LocalUsageStat[]
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
})

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

function formatMethod(value: string) {
  return value.replaceAll("_", " ")
}

function formatCostSource(value: string) {
  if (value === "mixed") {
    return "Mixed"
  }

  if (value === "unknown") {
    return "Unknown"
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value)

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)
}

function formatReset(value: string) {
  const date = new Date(value)
  const now = new Date()
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (isSameDay) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date)
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)
}

function toDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
}

function getLastCalendarDays(days: number) {
  const today = new Date()
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - (days - 1)
  )

  return Array.from({ length: days }).map((_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

export function LocalSourcePanel({ sources }: LocalSourcePanelProps) {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [details, setDetails] = useState<LocalSourceDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isQuotaRefreshing, setIsQuotaRefreshing] = useState(false)
  const [quotaMessage, setQuotaMessage] = useState<string | null>(null)
  const [showAllDailyUsage, setShowAllDailyUsage] = useState(false)
  const [showAllEvents, setShowAllEvents] = useState(false)

  useEffect(() => {
    if (!selectedProvider) {
      setDetails(null)
      setQuotaMessage(null)
      setShowAllDailyUsage(false)
      setShowAllEvents(false)
      return
    }

    const controller = new AbortController()

    setIsLoading(true)
    fetch(
      `/api/usage-sources/local/${encodeURIComponent(selectedProvider)}/details`,
      { signal: controller.signal, cache: "no-store" }
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load source details")
        }

        return response.json() as Promise<LocalSourceDetails>
      })
      .then((payload) => {
        setDetails(payload)
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }

        setDetails(null)
      })
      .finally(() => {
        setIsLoading(false)
      })

    return () => controller.abort()
  }, [selectedProvider])

  const selectedSource = useMemo(
    () => sources.find((source) => source.provider === selectedProvider),
    [selectedProvider, sources]
  )
  const chartData = useMemo(() => {
    if (!details) {
      return []
    }

    const usageByDate = new Map(
      details.dailyRollups.map((day) => [day.date, day])
    )

    return getLastCalendarDays(14).map((date) => {
      const key = toDateKey(date)
      const day = usageByDate.get(key)

      return {
        date: key,
        label: formatDate(key),
        tokens: day?.tokens ?? 0,
        cost: day?.cost ?? 0,
      }
    })
  }, [details])
  const visibleDailyRollups = useMemo(() => {
    const dailyRollups = details?.dailyRollups.slice().reverse() ?? []

    return showAllDailyUsage ? dailyRollups : dailyRollups.slice(0, 4)
  }, [details, showAllDailyUsage])
  const visibleEvents = useMemo(() => {
    const events = details?.latestEvents ?? []

    return showAllEvents ? events : events.slice(0, 3)
  }, [details, showAllEvents])

  const refreshCodexQuota = async () => {
    if (selectedProvider !== "Codex") {
      return
    }

    setIsQuotaRefreshing(true)
    setQuotaMessage(null)

    try {
      const response = await fetch("/api/usage-sources/codex/quota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowNetwork: true,
          allowCliFallback: true,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error ?? "Quota refresh failed")
      }

      setQuotaMessage("Quota refreshed")

      const detailsResponse = await fetch(
        `/api/usage-sources/local/${encodeURIComponent(selectedProvider)}/details`,
        { cache: "no-store" }
      )

      if (detailsResponse.ok) {
        setDetails((await detailsResponse.json()) as LocalSourceDetails)
      }
    } catch (error) {
      setQuotaMessage(
        error instanceof Error ? error.message : "Quota refresh failed"
      )
    } finally {
      setIsQuotaRefreshing(false)
    }
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        {sources.map((source) => (
          <button
            key={source.provider}
            type="button"
            onClick={() => setSelectedProvider(source.provider)}
            className="rounded-lg border border-border/80 bg-card/82 p-5 text-left shadow-sm transition hover:border-primary/30 hover:bg-accent/40"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase text-muted-foreground">
                  Local Source
                </p>
                <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                  {source.provider}
                </h2>
              </div>
              <div className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                Live import
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-[11px] uppercase text-muted-foreground">
                  Tokens
                </p>
                <p className="mt-1 font-semibold tabular-nums text-foreground">
                  {compactNumberFormatter.format(source.tokens)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-muted-foreground">
                  Spend
                </p>
                <p className="mt-1 font-semibold tabular-nums text-foreground">
                  {currencyFormatter.format(source.cost)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-muted-foreground">
                  Calls
                </p>
                <p className="mt-1 font-semibold tabular-nums text-foreground">
                  {compactNumberFormatter.format(source.calls)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedProvider ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/70 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close source details"
            className="absolute inset-0 cursor-default"
            onClick={() => setSelectedProvider(null)}
          />
          <aside className="relative flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <p className="text-[11px] font-medium uppercase text-muted-foreground">
                  Local usage source
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  {selectedProvider}
                </h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSelectedProvider(null)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {isLoading ? (
                <div className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
                  Loading source details...
                </div>
              ) : null}

              {!isLoading && selectedSource ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      ["Tokens", selectedSource.tokens],
                      ["Spend", selectedSource.cost],
                      ["Calls", selectedSource.calls],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-lg border border-border bg-card p-3"
                      >
                        <p className="text-[11px] uppercase text-muted-foreground">
                          {label}
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums">
                          {label === "Spend"
                            ? currencyFormatter.format(Number(value))
                            : compactNumberFormatter.format(Number(value))}
                        </p>
                      </div>
                    ))}
                  </div>

                  {details?.source ? (
                    <div className="rounded-lg border border-border bg-card p-4 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Method</span>
                        <span className="font-medium capitalize">
                          {formatMethod(details.source.collectionMethod)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Accuracy</span>
                        <span className="font-medium capitalize">
                          {formatMethod(details.source.accuracy)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Cost source</span>
                        <span className="font-medium capitalize">
                          {formatCostSource(details.source.costSource.mode)}
                        </span>
                      </div>
                      {details.source.costSource.mode === "mixed" ? (
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                          {details.source.costSource.explicitCount} explicit and{" "}
                          {details.source.costSource.estimatedCount} estimated
                          records
                        </p>
                      ) : null}
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Last import</span>
                        <span className="font-medium">
                          {formatDate(details.source.updatedAt)}
                        </span>
                      </div>
                      {details.source.privacyNote ? (
                        <p className="mt-3 text-xs leading-5 text-muted-foreground">
                          {details.source.privacyNote}
                        </p>
                      ) : null}
                      {details.source.importStats ? (
                        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
                          <div>
                            <p className="text-muted-foreground">Files</p>
                            <p className="mt-1 font-medium">
                              {details.source.importStats.filesScanned ?? 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Entries</p>
                            <p className="mt-1 font-medium">
                              {details.source.importStats.entriesScanned ?? 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Imported</p>
                            <p className="mt-1 font-medium">
                              {details.source.importStats.entriesImported ?? 0}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {selectedProvider === "Codex" ? (
                    <section className="rounded-lg border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold">
                            Rate Limits Remaining
                          </h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Uses local Codex auth or CLI status for live limits.
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground/80">
                            OAuth refresh sends your Codex bearer token to OpenAI.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={refreshCodexQuota}
                          disabled={isQuotaRefreshing}
                          className="h-8 rounded-lg px-3 text-xs"
                        >
                          {isQuotaRefreshing ? "Refreshing..." : "Refresh quota"}
                        </Button>
                      </div>

                      {details?.quota ? (
                        <div className="mt-4 space-y-3">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="rounded-full border border-border px-2 py-0.5 capitalize">
                              {formatMethod(details.quota.status)}
                            </span>
                            <span>{details.quota.sourceLabel}</span>
                            <span>{formatDate(details.quota.fetchedAt)}</span>
                          </div>

                          {details.quota.accountEmail ? (
                            <p className="truncate text-xs text-muted-foreground">
                              {details.quota.accountEmail}
                            </p>
                          ) : null}

                          <div className="grid gap-3 sm:grid-cols-2">
                            {[
                              ["5h", details.quota.primary],
                              ["Weekly", details.quota.secondary],
                            ].map(([label, window]) => {
                              const quotaWindow = window as NonNullable<
                                LocalSourceDetails["quota"]
                              >["primary"]

                              return (
                                <div
                                  key={label as string}
                                  className="rounded-lg border border-border/70 bg-muted/20 p-3"
                                >
                                  <p className="text-[11px] uppercase text-muted-foreground">
                                    {label as string}
                                  </p>
                                  <p className="mt-1 text-lg font-semibold tabular-nums">
                                    {quotaWindow.remainingPercent === null
                                      ? "Unknown"
                                      : `${quotaWindow.remainingPercent.toFixed(0)}%`}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {quotaWindow.resetsAt
                                      ? `Resets ${formatReset(quotaWindow.resetsAt)}`
                                      : quotaWindow.windowMinutes
                                        ? `${Math.round(
                                            quotaWindow.windowMinutes / 60
                                          )}h window`
                                        : "No reset data"}
                                  </p>
                                </div>
                              )
                            })}
                          </div>

                          {details.quota.creditsRemaining !== null ? (
                            <p className="text-xs text-muted-foreground">
                              Credits remaining:{" "}
                              {compactNumberFormatter.format(
                                details.quota.creditsRemaining
                              )}
                            </p>
                          ) : null}

                          {details.quota.error ? (
                            <p className="text-xs text-destructive">
                              {details.quota.error}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-4 text-xs text-muted-foreground">
                          No quota snapshot yet. Refreshing quota may send your
                          local Codex auth token to OpenAI to read usage limits.
                        </p>
                      )}

                      {quotaMessage ? (
                        <p className="mt-3 text-xs text-muted-foreground">
                          {quotaMessage}
                        </p>
                      ) : null}
                    </section>
                  ) : null}

                  <section className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-3 flex items-center justify-between text-sm">
                      <h3 className="font-semibold">Daily Token Trend</h3>
                      <span className="text-xs text-muted-foreground">
                        Last 14 days
                      </span>
                    </div>
                    <div className="h-[130px]">
                      {chartData.length ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={chartData}
                            margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
                          >
                            <XAxis dataKey="date" hide />
                            <Tooltip
                              contentStyle={{
                                borderColor: "var(--border)",
                                background: "var(--popover)",
                                color: "var(--foreground)",
                                borderRadius: "0.75rem",
                              }}
                              formatter={(value, name) => [
                                name === "cost"
                                  ? currencyFormatter.format(Number(value))
                                  : compactNumberFormatter.format(Number(value)),
                                name === "cost" ? "spend" : "tokens",
                              ]}
                              labelFormatter={(label, payload) => {
                                const date =
                                  payload?.[0]?.payload?.date ?? String(label)
                                return formatDate(String(date))
                              }}
                            />
                            <Bar
                              dataKey="tokens"
                              fill="var(--primary)"
                              radius={[999, 999, 0, 0]}
                              barSize={18}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          No daily usage yet
                        </div>
                      )}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold">Model Breakdown</h3>
                    <div className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
                      {details?.modelBreakdown.length ? (
                        details.modelBreakdown.map((model) => (
                          <div
                            key={model.model}
                            className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-3 text-sm"
                          >
                            <span className="truncate">{model.model}</span>
                            <span className="tabular-nums text-muted-foreground">
                              {compactNumberFormatter.format(model.tokens)}
                            </span>
                            <span className="tabular-nums text-muted-foreground">
                              {currencyFormatter.format(model.cost)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-5 text-sm text-muted-foreground">
                          No model data yet
                        </div>
                      )}
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold">Daily Usage</h3>
                      {(details?.dailyRollups.length ?? 0) > 4 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setShowAllDailyUsage((current) => !current)
                          }
                          className="h-7 px-2 text-xs"
                        >
                          {showAllDailyUsage ? "Show less" : "Expand"}
                        </Button>
                      ) : null}
                    </div>
                    <div className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
                      {details?.dailyRollups.length ? (
                        visibleDailyRollups.map((day) => (
                          <div
                            key={day.id}
                            className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-3 text-sm"
                          >
                            <span>{formatDate(day.date)}</span>
                            <span className="tabular-nums text-muted-foreground">
                              {compactNumberFormatter.format(day.tokens)}
                            </span>
                            <span className="tabular-nums text-muted-foreground">
                              {currencyFormatter.format(day.cost)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-5 text-sm text-muted-foreground">
                          No daily usage yet
                        </div>
                      )}
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold">Latest Events</h3>
                      {(details?.latestEvents.length ?? 0) > 3 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAllEvents((current) => !current)}
                          className="h-7 px-2 text-xs"
                        >
                          {showAllEvents ? "Show less" : "Expand"}
                        </Button>
                      ) : null}
                    </div>
                    <div className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
                      {details?.latestEvents.length ? (
                        visibleEvents.map((event) => (
                          <div
                            key={event.id}
                            className={cn(
                              "grid grid-cols-[1fr_auto] gap-3 px-4 py-3 text-sm"
                            )}
                          >
                            <div className="min-w-0">
                              <p className="truncate">{event.model}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {formatDate(event.date)} · {event.accuracy} ·{" "}
                                {formatCostSource(event.costSource)}
                              </p>
                            </div>
                            <div className="text-right tabular-nums text-muted-foreground">
                              <p>{compactNumberFormatter.format(event.tokens)}</p>
                              <p className="text-xs">
                                {currencyFormatter.format(event.cost)}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-5 text-sm text-muted-foreground">
                          No events yet
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  )
}
