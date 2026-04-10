"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  differenceInDays,
  eachDayOfInterval,
  format,
  formatDistanceToNow,
  subDays,
} from "date-fns"
import { Bar, BarChart, ResponsiveContainer, Tooltip } from "recharts"
import { Copy, X, ShieldCheck, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/toast"
import { useKeyboardShortcuts } from "@/components/keyboard-shortcuts"
import { formatEnvironment } from "@/lib/kosh"
import { getRotationStatus, needsRotationAttention } from "@/lib/rotation"
import {
  getPlatformColor,
  getPlatformColorWithAlpha,
  getPlatformInitial,
} from "@/lib/platform-config"
import { cn } from "@/lib/utils"

export type DashboardKeyRow = {
  id: string
  name: string
  platform: string
  environment: string
  createdAt: string
  expiresAt: string | null
  rotationIntervalDays: number | null
  rotationReminderDays: number
  lastRotatedAt: string | null
  lastLog: string | null
}

type UsageLogEntry = {
  id: string
  calls: number
  cost: number
  date: string // yyyy-MM-dd format
}

type DashboardKeyDetails = {
  key: {
    id: string
    name: string
    platform: string
    projectTag: string | null
    environment: string
    createdAt: string
    expiresAt: string | null
    notes: string | null
    rotationIntervalDays: number | null
    rotationReminderDays: number
    lastRotatedAt: string | null
  }
  usageLogs: UsageLogEntry[]
  totalCalls: number
  totalCost: number
  thisWeekCalls: number
  lastWeekCalls: number
}

type DashboardKeyTableProps = {
  keys: DashboardKeyRow[]
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
})

const ENVIRONMENT_COLORS: Record<string, string> = {
  production: "bg-emerald-500",
  development: "bg-amber-400",
  staging: "bg-slate-500",
}

const MASKED_SEGMENT = "••••••"

function PanelSkeleton() {
  return (
    <div className="flex h-full flex-col gap-5 px-6 py-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-muted/50" />
        <div className="space-y-2">
          <div className="h-5 w-32 rounded-full bg-muted/50" />
          <div className="h-4 w-20 rounded-full bg-muted/40" />
        </div>
      </div>

      <div className="h-12 rounded-2xl bg-muted/40" />

      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-16 rounded-2xl bg-muted/40" />
        ))}
      </div>

      <div className="h-[120px] rounded-2xl bg-muted/40" />

      <div className="grid grid-cols-2 gap-3">
        <div className="h-16 rounded-2xl bg-muted/40" />
        <div className="h-16 rounded-2xl bg-muted/40" />
      </div>

      <div className="h-32 rounded-2xl bg-muted/40" />
    </div>
  )
}

export function DashboardKeyTable({ keys }: DashboardKeyTableProps) {
  const [query, setQuery] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { success, error: toastError, info } = useToast()
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null)
  const [panelDetails, setPanelDetails] = useState<DashboardKeyDetails | null>(null)
  const [panelError, setPanelError] = useState<string | null>(null)
  const [panelCopied, setPanelCopied] = useState(false)
  type HealthCheckResult = { id: string; valid: boolean | null }
  const [healthResults, setHealthResults] = useState<Record<string, HealthCheckResult>>({})
  const [isChecking, setIsChecking] = useState(false)
  const [checkedCount, setCheckedCount] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const handleHealthCheck = useCallback(async () => {
    setIsChecking(true)
    setHealthResults({})
    setCheckedCount(0)
    const validCountRef = { current: 0 }
    const invalidCountRef = { current: 0 }
    const unknownCountRef = { current: 0 }
    let checked = 0

    for (const key of keys) {
      const connector = await fetch("/api/connectors").then((r) => r.json())
      const platformConnector = connector.find(
        (c: any) => c.platform === key.platform
      )

      if (!platformConnector?.canValidate) {
        unknownCountRef.current++
        checked++
        setCheckedCount(checked)
        setHealthResults((prev) => ({
          ...prev,
          [key.id]: { id: key.id, valid: null },
        }))
        continue
      }

      try {
        const res = await fetch(`/api/sync/${key.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "validate" }),
        })
        const data = await res.json()
        const isValid = data.valid ?? false
        if (isValid) validCountRef.current++
        else invalidCountRef.current++
        checked++
        setCheckedCount(checked)
        setHealthResults((prev) => ({
          ...prev,
          [key.id]: { id: key.id, valid: isValid },
        }))
      } catch {
        unknownCountRef.current++
        checked++
        setCheckedCount(checked)
        setHealthResults((prev) => ({
          ...prev,
          [key.id]: { id: key.id, valid: null },
        }))
      }
    }

    setIsChecking(false)
    setCheckedCount(0)
    const msg = `${validCountRef.current} valid, ${invalidCountRef.current} invalid, ${unknownCountRef.current} unknown`
    if (invalidCountRef.current > 0) {
      toastError("Health check complete", `${invalidCountRef.current} key(s) are invalid`)
    } else {
      success("Health check complete", msg)
    }
  }, [keys, success, toastError])

  useKeyboardShortcuts([
    { key: "/", handler: () => searchInputRef.current?.focus(), preventDefault: true },
    { key: "h", handler: () => { if (!isChecking) handleHealthCheck() }, preventDefault: true },
  ])

  const normalizedQuery = query.trim().toLowerCase()

  const filteredKeys = useMemo(() => {
    if (!normalizedQuery) return keys

    return keys.filter((key) => {
      const haystack = `${key.name} ${key.platform}`.toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [keys, normalizedQuery])

  const handleCopy = async (id: string) => {
    try {
      const res = await fetch("/api/keys/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!res.ok) {
        toastError("Copy failed", "Unable to reveal and copy the key")
        return
      }

      const { value } = await res.json()
      await navigator.clipboard.writeText(value)
      setCopiedId(id)
      success("Key copied to clipboard")
      setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current))
      }, 1400)
    } catch (err) {
      toastError("Copy failed")
    }
  }

  const handlePanelCopy = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!panelDetails) return

    try {
      const res = await fetch("/api/keys/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: panelDetails.key.id }),
      })

      if (!res.ok) {
        toastError("Copy failed", "Unable to reveal and copy the key")
        return
      }

      const { value } = await res.json()
      await navigator.clipboard.writeText(value)
      setPanelCopied(true)
      success("Key copied to clipboard")
      setTimeout(() => setPanelCopied(false), 2000)
    } catch (err) {
      toastError("Copy failed")
    }
  }

  const closePanel = useCallback(() => {
    setSelectedKeyId(null)
    setPanelDetails(null)
    setPanelError(null)
    setPanelCopied(false)
  }, [])

  const openPanelForKey = useCallback(
    (keyId: string) => {
      setPanelError(null)
      setPanelDetails(null)
      setSelectedKeyId(keyId)
    },
    [setPanelDetails, setPanelError, setSelectedKeyId]
  )

  useEffect(() => {
    if (!selectedKeyId) return

    const controller = new AbortController()

    fetch(`/api/keys/${selectedKeyId}/details`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Unable to load key details")
        return res.json()
      })
      .then((data: DashboardKeyDetails) => {
        setPanelDetails(data)
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setPanelError(error.message || "Unable to load key details")
      })

    return () => {
      controller.abort()
    }
  }, [selectedKeyId])

  useEffect(() => {
    if (!selectedKeyId) return

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePanel()
      }
    }

    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [selectedKeyId, closePanel])

  const chartData = useMemo(() => {
    if (!panelDetails) return []

    const today = new Date()
    const start = subDays(today, 6)
    const range = eachDayOfInterval({ start, end: today })
    const callsByDay = new Map<string, number>()

    panelDetails.usageLogs.forEach((log) => {
      const key = log.date
      if (key) {
        callsByDay.set(key, (callsByDay.get(key) ?? 0) + log.calls)
      }
    })

    return range.map((day) => {
      const key = format(day, "yyyy-MM-dd")
      return {
        date: key,
        label: format(day, "EEE"),
        dateLabel: format(day, "EEE, MMM d"),
        calls: callsByDay.get(key) ?? 0,
      }
    })
  }, [panelDetails])

  const changePercent = useMemo(() => {
    if (!panelDetails) return null
    if (panelDetails.lastWeekCalls === 0) return null
    const diff = panelDetails.thisWeekCalls - panelDetails.lastWeekCalls
    return Math.round((diff / panelDetails.lastWeekCalls) * 100)
  }, [panelDetails])

  const chartLabel = changePercent
    ? `${changePercent > 0 ? "+" : ""}${changePercent}% vs last week`
    : "— vs last week"

  const panelAccentColor = panelDetails
    ? getPlatformColor(panelDetails.key.platform)
    : getPlatformColor("Other")
  const panelSoftColor = panelDetails
    ? getPlatformColorWithAlpha(panelDetails.key.platform, 0.16)
    : getPlatformColorWithAlpha("Other", 0.16)
  const panelInitial = panelDetails
    ? getPlatformInitial(panelDetails.key.platform)
    : getPlatformInitial("Other")
  const isPanelLoading = Boolean(
    selectedKeyId && panelDetails === null && panelError === null
  )
  const panelExpiresAt = panelDetails?.key.expiresAt
    ? new Date(panelDetails.key.expiresAt)
    : null
  const panelExpiresInDays =
    panelExpiresAt !== null ? differenceInDays(panelExpiresAt, new Date()) : null
  const panelRotationStatus = panelDetails
    ? getRotationStatus(
        {
          rotationIntervalDays: panelDetails.key.rotationIntervalDays,
          rotationReminderDays: panelDetails.key.rotationReminderDays,
          lastRotatedAt: panelDetails.key.lastRotatedAt,
          createdAt: panelDetails.key.createdAt,
        },
        new Date()
      )
    : null
  const panelInfoItems = panelDetails
    ? [
        {
          label: "Environment",
          value: formatEnvironment(panelDetails.key.environment),
          dotColor:
            ENVIRONMENT_COLORS[panelDetails.key.environment] ??
            "bg-muted-foreground/80",
        },
        {
          label: "Project",
          value: panelDetails.key.projectTag ?? "—",
        },
        {
          label: "Last Logged",
          value: panelDetails.usageLogs[0]
            ? (() => {
                const dateStr = panelDetails.usageLogs[0].date
                if (!dateStr || typeof dateStr !== "string") return "Never"
                const parts = dateStr.split("-")
                if (parts.length !== 3) return "Never"
                const [year, month, day] = parts.map(Number)
                return `${formatDistanceToNow(new Date(year, month - 1, day))} ago`
              })()
            : "Never",
        },
          {
            label: "Created",
            value: format(new Date(panelDetails.key.createdAt), "MMM d, yyyy"),
          },
          ...(panelDetails.key.rotationIntervalDays
            ? [
                {
                  label: "Rotation",
                  value: (() => {
                    if (!panelRotationStatus) return "Configured"
                    if (panelRotationStatus.state === "overdue") {
                      return `Overdue by ${Math.abs(panelRotationStatus.daysUntilDue ?? 0)} days`
                    }
                    if (panelRotationStatus.state === "due_today") {
                      return "Due today"
                    }
                    if (panelRotationStatus.state === "due_soon") {
                      return `Due in ${panelRotationStatus.daysUntilDue} days`
                    }
                    return panelRotationStatus.dueAt
                      ? `Due ${format(panelRotationStatus.dueAt, "MMM d, yyyy")}`
                      : "Configured"
                  })(),
                  valueClassName:
                    panelRotationStatus?.state === "overdue" ||
                    panelRotationStatus?.state === "due_today"
                      ? "text-destructive"
                      : panelRotationStatus?.state === "due_soon"
                        ? "text-amber-400"
                        : "text-foreground",
                },
              ]
            : []),
          ...(panelExpiresAt
            ? [
                {
                label: "Expires",
                value: format(panelExpiresAt, "MMM d, yyyy"),
                valueClassName:
                  panelExpiresInDays === null
                    ? "text-foreground"
                    : panelExpiresInDays < 0
                      ? "text-destructive"
                      : panelExpiresInDays <= 30
                        ? "text-amber-400"
                        : "text-foreground",
              },
            ]
          : []),
      ]
    : []

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <Input
            ref={searchInputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter keys..."
            className="h-12 w-full rounded-xl border border-border bg-background/70 px-4 shadow-sm"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleHealthCheck}
          disabled={isChecking}
          className="flex items-center gap-2 text-sm"
        >
          {isChecking ? (
            <Loader2 className="animate-spin size-4" />
          ) : (
            <ShieldCheck className="size-4" />
          )}
          {isChecking ? `Checking ${checkedCount}/${keys.length}...` : "Health Check"}
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs font-medium uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left">Platform</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Environment</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Last Logged</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredKeys.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-sm text-muted-foreground/80"
                  >
                    No keys match your search
                  </td>
                </tr>
              ) : (
                  filteredKeys.map((key) => {
                    const accentColor = getPlatformColor(key.platform)
                    const softColor = getPlatformColorWithAlpha(key.platform, 0.16)
                    const initial = getPlatformInitial(key.platform)
                    const lastLogLabel = key.lastLog
                      ? `${formatDistanceToNow(new Date(key.lastLog))} ago`
                      : "Never"
                    const maskedValue = `sk-${MASKED_SEGMENT}${key.id.slice(-4)}`
                    const healthResult = healthResults[key.id]
                    const rotationStatus = getRotationStatus(key)
                    const hasRotationAttention = needsRotationAttention(rotationStatus.state)
                    const statusLabel =
                      healthResult?.valid === true
                        ? "Valid"
                        : healthResult?.valid === false
                          ? "Invalid"
                          : healthResult?.valid === null
                            ? "Unknown"
                            : rotationStatus.state === "overdue"
                              ? `Overdue by ${Math.abs(rotationStatus.daysUntilDue ?? 0)} days`
                              : rotationStatus.state === "due_today"
                                ? "Rotate today"
                                : rotationStatus.state === "due_soon"
                                  ? `Rotate in ${rotationStatus.daysUntilDue} days`
                                  : "Active"
                    const statusTone =
                      healthResult?.valid === true
                        ? "text-emerald-400"
                        : healthResult?.valid === false
                          ? "text-destructive"
                          : healthResult?.valid === null
                            ? "text-muted-foreground"
                            : hasRotationAttention
                              ? "text-amber-500"
                              : "text-muted-foreground"
                    const statusDot =
                      healthResult?.valid === true
                        ? "bg-emerald-500"
                        : healthResult?.valid === false
                          ? "bg-destructive/70"
                          : healthResult?.valid === null
                            ? "bg-muted-foreground/60"
                            : hasRotationAttention
                              ? "bg-amber-500"
                              : "bg-muted-foreground/60"

                    return (
                    <tr
                      key={key.id}
                      className="cursor-pointer border-b border-border/60 bg-card text-sm text-foreground transition-colors hover:bg-muted/40"
                      onClick={() => openPanelForKey(key.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          openPanelForKey(key.id)
                        }
                      }}
                    >
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-semibold"
                            style={{
                              color: accentColor,
                              backgroundColor: softColor,
                              borderColor: softColor,
                            }}
                          >
                            {initial}
                          </div>
                          <span className="font-medium text-foreground">
                            {key.platform}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {key.name}
                          </p>
                          <p className="text-xs font-mono text-muted-foreground">
                            {maskedValue}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <span className="inline-flex items-center rounded-full border border-border/80 bg-secondary px-3 py-0.5 text-xs font-medium text-secondary-foreground">
                          {formatEnvironment(key.environment)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              statusDot
                            )}
                          />
                          <span
                            className={cn(statusTone)}
                          >
                            {statusLabel}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle text-muted-foreground">
                        {lastLogLabel}
                      </td>
                      <td className="px-4 py-4 align-middle text-right">
                        <div className="relative inline-flex" onClick={(event) => event.stopPropagation()}>
                          <span
                            className={cn(
                              "pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md border border-border/80 bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-sm transition-all duration-200",
                              copiedId === key.id
                                ? "translate-y-0 opacity-100"
                                : "translate-y-1 opacity-0"
                            )}
                          >
                            Copied!
                          </span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleCopy(key.id)}
                            className="rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="Copy key"
                            title="Copy key"
                          >
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-40 transition-opacity duration-300",
          selectedKeyId
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
        onClick={closePanel}
        aria-hidden={!selectedKeyId}
      >
        <div className="h-full w-full bg-black/40" />
      </div>

      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[400px] transform flex-col overflow-y-auto border-l border-border bg-card shadow-lg transition-transform duration-300",
          selectedKeyId ? "translate-x-0" : "translate-x-full"
        )}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Key details panel"
        aria-hidden={!selectedKeyId}
      >
        <div className="flex items-center justify-between border-b border-border px-6 pb-4 mb-4">
          <div className="flex items-center gap-4">
            <div
              className="flex size-10 items-center justify-center rounded-2xl border text-sm font-semibold"
              style={{
                color: panelAccentColor,
                backgroundColor: panelSoftColor,
                borderColor: panelSoftColor,
              }}
            >
              {panelInitial}
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                {panelDetails ? panelDetails.key.name : "Loading..."}
              </p>
              <p className="text-sm text-muted-foreground">
                {panelDetails ? panelDetails.key.platform : "Platform"} • Active
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={closePanel}
            aria-label="Close panel"
          >
            <X className="size-4" />
          </Button>
        </div>

        {isPanelLoading ? (
          <PanelSkeleton />
        ) : panelError ? (
          <div className="flex flex-1 items-center justify-center px-6 py-10 text-sm text-muted-foreground">
            {panelError}
          </div>
        ) : panelDetails ? (
          <div className="flex flex-1 flex-col gap-6 pb-6">
            <div className="px-6">
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm font-mono text-muted-foreground">
                  {`sk-${MASKED_SEGMENT}${panelDetails.key.id.slice(-4)}`}
                </div>
                <div className="relative">
                  <span
                    className={cn(
                      "pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md border border-border/80 bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-sm transition-all duration-200",
                      panelCopied ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                    )}
                  >
                    Copied!
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handlePanelCopy}
                    className="rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Copy key"
                  >
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="px-6">
              <div className="grid gap-3 md:grid-cols-2">
                {panelInfoItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-border bg-muted/40 p-3"
                  >
                    <p className="mb-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                      {item.label}
                    </p>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {item.dotColor ? (
                        <span className={cn("h-2 w-2 rounded-full", item.dotColor)} />
                      ) : null}
                      <span
                        className={cn(
                          item.valueClassName ?? "text-foreground"
                        )}
                      >
                        {item.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {panelDetails.key.notes ? (
              <div className="px-6">
                <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
                  NOTES
                </p>
                <div className="bg-muted/40 rounded-lg p-3 text-sm text-muted-foreground">
                  {panelDetails.key.notes}
                </div>
              </div>
            ) : null}

            <div className="space-y-1 px-6">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <p>Weekly Volume</p>
                <span>{chartLabel}</span>
              </div>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Tooltip
                      contentStyle={{
                        borderColor: "var(--border)",
                        background: "var(--popover)",
                        color: "var(--foreground)",
                        borderRadius: "0.75rem",
                      }}
                      formatter={(value) => [value?.toLocaleString?.() ?? value, "calls"]}
                      labelFormatter={(label, payload) => {
                        const dateLabel = payload?.[0]?.payload?.dateLabel
                        if (typeof dateLabel === "string") return dateLabel
                        if (!label || typeof label !== "string") return String(label ?? "")
                        const parts = label.split("-")
                        if (parts.length !== 3) return label
                        const [year, month, day] = parts.map(Number)
                        return format(new Date(year, month - 1, day), "EEE, MMM d")
                      }}
                    />
                    <Bar
                      dataKey="calls"
                      fill={panelAccentColor}
                      radius={[999, 999, 0, 0]}
                      barSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 px-6">
              <div className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                  Total Calls
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {panelDetails.totalCalls.toLocaleString()}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                  Accrued Cost
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {currencyFormatter.format(panelDetails.totalCost)}
                </p>
              </div>
            </div>

            <div className="space-y-2 px-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">
                  Activity Log (7D)
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/40">
                {panelDetails.usageLogs.length === 0 ? (
                  <div className="px-4 py-5 text-center text-sm text-muted-foreground">
                    No activity recorded yet
                  </div>
                ) : (
                  panelDetails.usageLogs.map((log) => (
                   <div
                     key={log.id}
                     className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2.5 border-b border-border/50 text-sm text-muted-foreground"
                   >
                      <span className="text-foreground">
                        {(() => {
                          if (!log.date || typeof log.date !== "string") return "Invalid date"
                          const parts = log.date.split("-")
                          if (parts.length !== 3) return log.date
                          const [year, month, day] = parts.map(Number)
                          return format(new Date(year, month - 1, day), "MMM d, yyyy")
                        })()}
                      </span>
                      <span className="text-right font-semibold">
                        {log.calls.toLocaleString()}
                      </span>
                      <span className="text-right">
                        {currencyFormatter.format(log.cost)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
