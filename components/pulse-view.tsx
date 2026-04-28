"use client"

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import {
  DollarSign,
  FolderOpen,
  Layers,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react"
import {
  eachDayOfInterval,
  format,
  formatDistanceToNow,
  isToday,
  startOfDay,
  subDays,
} from "date-fns"
import { useRouter } from "next/navigation"
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ConnectorInfo } from "@/lib/connectors/types"
import { formatEnvironment, KoshKey } from "@/lib/kosh"
import {
  getPlatformColor,
  getPlatformColorWithAlpha,
  getPlatformInitial,
} from "@/lib/platform-config"
import { cn } from "@/lib/utils"

type PulseKey = KoshKey & {
  usageDailyRollups: Array<{
    id: string
    calls: number
    cost: number
    totalTokens: number | null
    rollupDate: string | Date
    updatedAt: string | Date
  }>
}

type PulseUsageSource = {
  id: string
  name: string
  provider: string | null
  collectionMethod: string
  accuracy: string
  usageDailyRollups: Array<{
    id: string
    calls: number
    cost: number
    totalTokens: number | null
    rollupDate: string | Date
    updatedAt: string | Date
  }>
}

type SparklinePoint = {
  date: string
  label: string
  calls: number
}

type ValidationFeedback = {
  tone: "success" | "error"
  text: string
}

const subscribe = () => () => {}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function sumRecentCalls(
  rollups: Array<{
    calls: number
    rollupDate: string | Date
  }>,
  since: Date
) {
  return rollups
    .filter((rollup) => new Date(rollup.rollupDate) >= since)
    .reduce((sum, rollup) => sum + rollup.calls, 0)
}

export function PulseView({
  keys,
  usageSources = [],
}: {
  keys: PulseKey[]
  usageSources?: PulseUsageSource[]
}) {
  const router = useRouter()
  const mounted = useSyncExternalStore(subscribe, () => true, () => false)
  const [loggingKey, setLoggingKey] = useState<PulseKey | null>(null)
  const [logLoading, setLogLoading] = useState(false)
  const [connectorInfo, setConnectorInfo] = useState<Record<string, ConnectorInfo>>(
    {}
  )
  const [syncingKeyId, setSyncingKeyId] = useState<string | null>(null)
  const [freePlanFlags, setFreePlanFlags] = useState<Record<string, boolean>>({})
  const [syncFeedback, setSyncFeedback] = useState<Record<string, string>>({})
  const [syncErrors, setSyncErrors] = useState<Record<string, string>>({})
  const [validationFeedback, setValidationFeedback] = useState<
    Record<string, ValidationFeedback>
  >({})
  const [fadingValidationIds, setFadingValidationIds] = useState<
    Record<string, boolean>
  >({})
  const validationFadeTimeouts = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({})
  const validationClearTimeouts = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({})
  const [form, setForm] = useState({
    calls: "",
    cost: "",
    tokens: "",
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [activePlatform, setActivePlatform] = useState("All")

  useEffect(() => {
    const fadeTimeouts = validationFadeTimeouts.current
    const clearTimeouts = validationClearTimeouts.current

    return () => {
      Object.values(fadeTimeouts).forEach(clearTimeout)
      Object.values(clearTimeouts).forEach(clearTimeout)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadConnectors = async () => {
      const response = await fetch("/api/connectors", {
        cache: "no-store",
      }).catch(() => null)

      if (!response?.ok) {
        return
      }

      const data = (await response.json().catch(() => [])) as ConnectorInfo[]

      if (!cancelled && Array.isArray(data)) {
        setConnectorInfo(
          data.reduce<Record<string, ConnectorInfo>>((acc, connector) => {
            acc[connector.platform] = connector
            return acc
          }, {})
        )
      }
    }

    loadConnectors()

    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    const keyLogs = keys.flatMap((key) =>
      key.usageDailyRollups.map((rollup) => ({
        id: rollup.id,
        apiKeyId: key.id,
        calls: rollup.calls,
        cost: rollup.cost,
        tokens: rollup.totalTokens,
        date: rollup.rollupDate,
        label: key.name,
      }))
    )
    const sourceLogs = usageSources.flatMap((source) =>
      source.usageDailyRollups.map((rollup) => ({
        id: rollup.id,
        apiKeyId: source.id,
        calls: rollup.calls,
        cost: rollup.cost,
        tokens: rollup.totalTokens,
        date: rollup.rollupDate,
        label: source.provider ?? source.name,
      }))
    )
    const allLogs = [...keyLogs, ...sourceLogs]
    const todayLogs = allLogs.filter((log) => isToday(new Date(log.date)))
    const sevenDaysAgo = subDays(new Date(), 7)

    const totalSpendToday = todayLogs.reduce((sum, log) => sum + log.cost, 0)
    const totalCallsToday = todayLogs.reduce((sum, log) => sum + log.calls, 0)

    const mostActive = [
      ...keys.map((key) => ({
        name: key.name,
        calls: sumRecentCalls(key.usageDailyRollups, sevenDaysAgo),
      })),
      ...usageSources.map((source) => ({
        name: source.provider ?? source.name,
        calls: sumRecentCalls(source.usageDailyRollups, sevenDaysAgo),
      })),
    ]
      .sort((left, right) => right.calls - left.calls)[0]

    return {
      totalSpendToday,
      totalCallsToday,
      mostActiveKey:
        mostActive && mostActive.calls > 0 ? mostActive.name : "No data yet",
    }
  }, [keys, usageSources])

  const platforms = useMemo(
    () => Array.from(new Set(keys.map((key) => key.platform))),
    [keys]
  )
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const effectivePlatform = platforms.includes(activePlatform)
    ? activePlatform
    : "All"
  const filteredKeys = useMemo(() => {
    return keys.filter((key) => {
      const matchesPlatform =
        effectivePlatform === "All" || key.platform === effectivePlatform

      const matchesSearch =
        normalizedSearch.length === 0 ||
        key.name.toLowerCase().includes(normalizedSearch) ||
        key.platform.toLowerCase().includes(normalizedSearch)

      return matchesPlatform && matchesSearch
    })
  }, [effectivePlatform, keys, normalizedSearch])

  const buildSparklineData = (
    logs: Array<{ calls: number; rollupDate: string | Date }>
  ) => {
    const today = startOfDay(new Date())
    const days = eachDayOfInterval({
      start: subDays(today, 6),
      end: today,
    })

    const callsByDay = logs.reduce<Record<string, number>>((acc, log) => {
      const dayKey = format(startOfDay(new Date(log.rollupDate)), "yyyy-MM-dd")
      acc[dayKey] = (acc[dayKey] ?? 0) + log.calls
      return acc
    }, {})

    return days.map<SparklinePoint>((day) => {
      const dateKey = format(day, "yyyy-MM-dd")

      return {
        date: dateKey,
        label: format(day, "MMM d"),
        calls: callsByDay[dateKey] ?? 0,
      }
    })
  }

  const handleSaveUsage = async () => {
    if (!loggingKey || !form.calls || !form.cost) {
      return
    }

    setLogLoading(true)

    const response = await fetch("/api/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKeyId: loggingKey.id,
        calls: Number(form.calls),
        cost: Number(form.cost),
        tokens: form.tokens ? Number(form.tokens) : null,
      }),
    })

    setLogLoading(false)

    if (!response.ok) {
      return
    }

    setLoggingKey(null)
    setForm({ calls: "", cost: "", tokens: "" })
    router.refresh()
  }

  const handleSync = async (key: PulseKey) => {
    setSyncingKeyId(key.id)
    setSyncErrors((prev) => {
      const next = { ...prev }
      delete next[key.id]
      return next
    })

    try {
      const response = await fetch(`/api/sync/${key.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || payload?.success === false) {
        setSyncErrors((prev) => ({
          ...prev,
          [key.id]:
            typeof payload?.error === "string" ? payload.error : "Sync failed",
        }))
        return
      }

      setSyncFeedback((prev) => ({
        ...prev,
        [key.id]: "Synced just now",
      }))
      setFreePlanFlags((prev) => ({
        ...prev,
        [key.id]: payload?.meta?.freeplan === true,
      }))

      router.refresh()
    } catch {
      setSyncErrors((prev) => ({
        ...prev,
        [key.id]: "Sync failed",
      }))
    } finally {
      setSyncingKeyId(null)
    }
  }

  const showValidationFeedback = (
    keyId: string,
    tone: ValidationFeedback["tone"],
    text: string
  ) => {
    const fadeTimeout = validationFadeTimeouts.current[keyId]
    const clearTimeoutId = validationClearTimeouts.current[keyId]

    if (fadeTimeout) {
      clearTimeout(fadeTimeout)
    }

    if (clearTimeoutId) {
      clearTimeout(clearTimeoutId)
    }

    setFadingValidationIds((prev) => {
      const next = { ...prev }
      delete next[keyId]
      return next
    })
    setValidationFeedback((prev) => ({
      ...prev,
      [keyId]: { tone, text },
    }))

    validationFadeTimeouts.current[keyId] = setTimeout(() => {
      setFadingValidationIds((prev) => ({
        ...prev,
        [keyId]: true,
      }))
    }, 4500)

    validationClearTimeouts.current[keyId] = setTimeout(() => {
      setValidationFeedback((prev) => {
        const next = { ...prev }
        delete next[keyId]
        return next
      })
      setFadingValidationIds((prev) => {
        const next = { ...prev }
        delete next[keyId]
        return next
      })
      delete validationFadeTimeouts.current[keyId]
      delete validationClearTimeouts.current[keyId]
    }, 5000)
  }

  const handleValidate = async (key: PulseKey) => {
    setSyncingKeyId(key.id)
    setSyncErrors((prev) => {
      const next = { ...prev }
      delete next[key.id]
      return next
    })

    try {
      const response = await fetch(`/api/sync/${key.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate" }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || payload?.success === false) {
        showValidationFeedback(
          key.id,
          "error",
          typeof payload?.error === "string"
            ? payload.error
            : "Validation failed"
        )
        return
      }

      showValidationFeedback(
        key.id,
        payload?.valid ? "success" : "error",
        payload?.valid ? "Key is valid \u2713" : "Invalid key"
      )
    } catch {
      showValidationFeedback(key.id, "error", "Validation failed")
    } finally {
      setSyncingKeyId(null)
    }
  }

  return (
    <>
      <div className="mb-8 space-y-2">
        <Badge
          variant="outline"
          className="h-6 rounded-full border-border/80 bg-background/70 px-2.5 text-[11px] font-medium text-muted-foreground"
        >
          Pulse
        </Badge>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Pulse
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Usage and cost across your keys and local AI sources.
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card
          size="sm"
          className="bg-card/80 shadow-sm ring-border/80 backdrop-blur"
        >
          <CardContent className="flex items-center gap-3 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <DollarSign className="size-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Total spend today
              </p>
              <p className="text-2xl font-medium tracking-tight text-foreground/85">
                {formatCurrency(stats.totalSpendToday)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          size="sm"
          className="bg-card/80 shadow-sm ring-border/80 backdrop-blur"
        >
          <CardContent className="flex items-center gap-3 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Layers className="size-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Total API calls today
              </p>
              <p className="text-2xl font-medium tracking-tight text-foreground/85">
                {stats.totalCallsToday}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          size="sm"
          className="bg-card/80 shadow-sm ring-border/80 backdrop-blur"
        >
          <CardContent className="flex items-center gap-3 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <FolderOpen className="size-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Most active source
              </p>
              <p className="truncate text-lg font-medium tracking-tight text-foreground/85">
                {stats.mostActiveKey}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 h-px bg-border/70" />

      {usageSources.length > 0 ? (
        <div className="mb-6 grid gap-3 lg:grid-cols-2">
          {usageSources.map((source) => {
            const logs = source.usageDailyRollups
            const totalCalls = logs.reduce((sum, log) => sum + log.calls, 0)
            const totalCost = logs.reduce((sum, log) => sum + log.cost, 0)
            const totalTokens = logs.reduce(
              (sum, log) => sum + (log.totalTokens ?? 0),
              0
            )
            const latestLog = logs[0]
            const sparklineData = buildSparklineData(logs)
            const hasSparklineData = sparklineData.some((point) => point.calls > 0)

            return (
              <Card
                key={source.id}
                className="overflow-hidden border-l-4 border-l-primary bg-card/85 shadow-sm ring-border/80"
              >
                <CardContent className="flex flex-col gap-4 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Local source
                      </p>
                      <h2 className="mt-1 text-base font-semibold tracking-tight">
                        {source.provider ?? source.name}
                      </h2>
                      <p className="mt-1 text-xs capitalize text-muted-foreground">
                        {source.collectionMethod.replaceAll("_", " ")} / {source.accuracy}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="h-6 rounded-full border-border/80 bg-muted/60 px-2.5 text-[11px] font-medium text-muted-foreground"
                    >
                      Live
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[11px] uppercase text-muted-foreground">
                        Tokens
                      </p>
                      <p className="mt-1 font-semibold tabular-nums">
                        {totalTokens.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase text-muted-foreground">
                        Spend
                      </p>
                      <p className="mt-1 font-semibold tabular-nums">
                        {formatCurrency(totalCost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase text-muted-foreground">
                        Calls
                      </p>
                      <p className="mt-1 font-semibold tabular-nums">
                        {totalCalls.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {latestLog ? (
                    <p className="text-[11px] text-muted-foreground">
                      Last logged {formatDistanceToNow(new Date(latestLog.updatedAt))} ago
                    </p>
                  ) : null}

                  {mounted && hasSparklineData ? (
                    <div className="h-12 w-full min-w-0 overflow-hidden rounded-xl border border-border/60 bg-muted/20 px-2 py-1 pointer-events-none">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <AreaChart data={sparklineData}>
                          <Area
                            type="monotone"
                            dataKey="calls"
                            stroke="var(--primary)"
                            strokeWidth={2}
                            fill="var(--primary)"
                            fillOpacity={0.12}
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : null}

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keys..."
            className="h-10 rounded-xl border-border/70 bg-card/70 pl-9 shadow-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {["All", ...platforms].map((platform) => {
            const isActive = platform === effectivePlatform
            return (
              <Button
                key={platform}
                type="button"
                variant={isActive ? "secondary" : "outline"}
                size="sm"
                onClick={() =>
                  setActivePlatform((current) =>
                    platform === "All" ? "All" : current === platform ? "All" : platform
                  )
                }
                className={cn(
                  "rounded-full px-3",
                  isActive
                    ? "bg-secondary text-secondary-foreground shadow-sm"
                    : "border-border/70 bg-card/70 text-muted-foreground hover:text-foreground"
                )}
              >
                {platform}
              </Button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {filteredKeys.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            No keys match your search
          </div>
        ) : (
          filteredKeys.map((key) => {
          const accentColor = getPlatformColor(key.platform)
          const softColor = getPlatformColorWithAlpha(key.platform, 0.16)
          const initial = getPlatformInitial(key.platform)
          const capability = connectorInfo[key.platform] ?? connectorInfo.Other
          const canSync = capability?.canSync ?? false
          const canValidate = capability?.canValidate ?? false
          const totalCalls = key.usageDailyRollups.reduce((sum, log) => sum + log.calls, 0)
          const totalCost = key.usageDailyRollups.reduce((sum, log) => sum + log.cost, 0)
          const latestLog = key.usageDailyRollups[0]
          const sparklineData = buildSparklineData(key.usageDailyRollups)
          const hasSparklineData = sparklineData.some((point) => point.calls > 0)
          const isSyncing = syncingKeyId === key.id
          const isFreePlan = freePlanFlags[key.id] === true
          const syncError = syncErrors[key.id]
          const syncMessage = syncFeedback[key.id]
          const validationMessage = validationFeedback[key.id]
          const isValidationFading = fadingValidationIds[key.id]
          const showMetricCards = key.usageDailyRollups.length > 0

          return (
            <Card
              key={key.id}
              className="overflow-visible border-l-4 bg-card/85 shadow-sm ring-border/80 transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:bg-accent/40 hover:shadow-md"
              style={{ borderLeftColor: accentColor }}
            >
              <CardContent className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold"
                    style={{
                      color: accentColor,
                      backgroundColor: softColor,
                      borderColor: softColor,
                    }}
                  >
                    {initial}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold tracking-tight">
                        {key.name}
                      </p>
                      <Badge
                        variant="outline"
                        className="h-6 rounded-full border-border/80 bg-muted/60 px-2.5 text-[11px] font-medium text-muted-foreground"
                      >
                        {formatEnvironment(key.environment)}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{key.platform}</span>
                      {key.projectTag ? (
                        <>
                          <span className="text-muted-foreground/50">/</span>
                          <span>{key.projectTag}</span>
                        </>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      {latestLog
                        ? `Last logged ${formatDistanceToNow(
                            new Date(latestLog.updatedAt)
                          )} ago`
                        : "No data yet"}
                    </p>
                    {syncMessage ? (
                      <p className="mt-1 text-[11px] text-muted-foreground/60">
                        {syncMessage}
                      </p>
                    ) : null}
                    {syncError ? (
                      <p className="mt-1 text-[11px] text-destructive/80">
                        {syncError}
                      </p>
                    ) : null}
                    {validationMessage ? (
                      <p
                        className={cn(
                          "mt-1 text-[11px] transition-opacity duration-500",
                          validationMessage.tone === "success"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive/80",
                          isValidationFading ? "opacity-0" : "opacity-100"
                        )}
                      >
                        {validationMessage.text}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-4 md:min-w-[360px] md:items-end">
                  {!showMetricCards ? (
                    <p className="text-sm text-muted-foreground">
                      No usage logged yet
                    </p>
                  ) : (
                    <div className="grid w-full gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5">
                        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          Total calls
                        </p>
                        <p className="mt-1 text-lg font-medium tracking-tight text-foreground/90">
                          {totalCalls}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5">
                        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          {isFreePlan ? "Free plan" : "Total cost"}
                        </p>
                        {isFreePlan ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Free plan - $0 cost tracked
                          </p>
                        ) : (
                          <p className="mt-1 text-lg font-medium tracking-tight text-foreground/90">
                            {formatCurrency(totalCost)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {mounted && hasSparklineData ? (
                    <div className="h-12 w-full min-w-0 overflow-hidden rounded-xl border border-border/60 bg-muted/20 px-2 py-1 pointer-events-none">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <AreaChart
                          data={sparklineData}
                          margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id={`pulse-gradient-${key.id}`}
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor={accentColor}
                                stopOpacity={0.28}
                              />
                              <stop
                                offset="100%"
                                stopColor={accentColor}
                                stopOpacity={0.04}
                              />
                            </linearGradient>
                          </defs>
                          <Tooltip
                            cursor={{
                              stroke: "var(--border)",
                              strokeOpacity: 0.6,
                              strokeWidth: 1,
                            }}
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid var(--border)",
                              background: "var(--popover)",
                              color: "var(--popover-foreground)",
                              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
                            }}
                            labelStyle={{
                              color: "var(--muted-foreground)",
                              fontSize: 11,
                              marginBottom: 4,
                            }}
                            itemStyle={{
                              color: "var(--popover-foreground)",
                              fontSize: 12,
                              padding: 0,
                            }}
                            wrapperStyle={{
                              zIndex: 20,
                            }}
                            formatter={(value) => [`${value} calls`, "Usage"]}
                            labelFormatter={(_, payload) =>
                              payload?.[0]?.payload?.label ?? ""
                            }
                          />
                          <Area
                            type="monotone"
                            dataKey="calls"
                            stroke={accentColor}
                            strokeWidth={2}
                            fill={`url(#pulse-gradient-${key.id})`}
                            dot={false}
                            activeDot={{
                              r: 3,
                              strokeWidth: 0,
                              fill: accentColor,
                            }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : null}

                  {key.platform === "NVIDIA NIM" ? (
                    <p className="w-full text-[11px] text-muted-foreground/70 md:text-right">
                      NVIDIA NIM doesn&apos;t expose usage data - log manually
                    </p>
                  ) : null}

                  {!canSync && !canValidate ? (
                    <p className="w-full text-[11px] text-muted-foreground/70 md:text-right">
                      Manual logging only
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    {canSync ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isSyncing}
                        onClick={() => handleSync(key)}
                        className="gap-2 rounded-xl border-border/70 bg-card/70"
                      >
                        <RefreshCw
                          className={isSyncing ? "size-4 animate-spin" : "size-4"}
                        />
                        Sync
                      </Button>
                    ) : null}

                    {!canSync && canValidate ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isSyncing}
                        onClick={() => handleValidate(key)}
                        className="gap-2 rounded-xl border-border/70 bg-card/70"
                      >
                        <ShieldCheck className="size-4" />
                        Validate
                      </Button>
                    ) : null}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLoggingKey(key)
                        setForm({ calls: "", cost: "", tokens: "" })
                      }}
                      className="gap-2 rounded-xl border-border/70 bg-card/70"
                    >
                      <Plus className="size-4" />
                      Log usage
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
      </div>

      <Dialog
        open={loggingKey !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !logLoading) {
            setLoggingKey(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-sm" showCloseButton={!logLoading}>
          <DialogHeader>
            <DialogTitle>Log usage</DialogTitle>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Calls</Label>
              <Input
                type="number"
                min="0"
                value={form.calls}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, calls: event.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Cost in USD</Label>
              <Input
                type="number"
                min="0"
                step="0.001"
                value={form.cost}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, cost: event.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Tokens</Label>
              <Input
                type="number"
                min="0"
                value={form.tokens}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, tokens: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLoggingKey(null)}
              disabled={logLoading}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveUsage} disabled={logLoading}>
              {logLoading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
