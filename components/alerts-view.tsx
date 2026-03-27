"use client"

import { useMemo, useState } from "react"
import { BellOff, FolderOpen, Layers, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { useKoshShell } from "@/components/kosh-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  formatEnvironment,
  KoshAlertWithKey,
  PLATFORM_THEMES,
} from "@/lib/kosh"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatAlertType(type: KoshAlertWithKey["type"]) {
  if (type === "rate_limit") return "Rate Limit"
  if (type === "calls") return "Calls"
  return "Cost"
}

function formatThreshold(alert: KoshAlertWithKey) {
  if (alert.type === "cost") {
    return formatCurrency(alert.threshold)
  }

  return `${alert.threshold} calls`
}

export function AlertsView({ alerts }: { alerts: KoshAlertWithKey[] }) {
  const router = useRouter()
  const { openSidebarAction } = useKoshShell()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const stats = useMemo(() => {
    return {
      totalAlerts: alerts.length,
      activeAlerts: alerts.filter((alert) => alert.triggered).length,
      keysMonitored: new Set(alerts.map((alert) => alert.apiKeyId)).size,
    }
  }, [alerts])

  const handleReset = async (id: string) => {
    setPendingId(id)
    const res = await fetch(`/api/alerts/${id}/reset`, {
      method: "PATCH",
    })
    setPendingId(null)

    if (!res.ok) return

    router.refresh()
  }

  const handleDelete = async (id: string) => {
    setPendingId(id)
    const res = await fetch(`/api/alerts/${id}`, {
      method: "DELETE",
    })
    setPendingId(null)

    if (!res.ok) return

    router.refresh()
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-border/70 bg-card/80 px-8 py-12 text-center shadow-sm backdrop-blur">
          <div className="mb-6 flex size-[4.5rem] items-center justify-center rounded-3xl bg-muted text-foreground shadow-inner">
            <BellOff className="size-8" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            No alerts configured
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Add an alert to monitor your API keys
          </p>
          <Button
            onClick={openSidebarAction}
            className="mt-6 gap-2 rounded-xl px-5"
          >
            <Plus className="size-4" />
            Add alert
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-8 space-y-2">
        <Badge
          variant="outline"
          className="h-6 rounded-full border-border/80 bg-background/70 px-2.5 text-[11px] font-medium text-muted-foreground"
        >
          Alerts
        </Badge>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Alerts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Get notified when keys cross your thresholds.
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total alerts configured", value: stats.totalAlerts, icon: Layers },
          { label: "Active alerts", value: stats.activeAlerts, icon: BellOff },
          { label: "Keys monitored", value: stats.keysMonitored, icon: FolderOpen },
        ].map(({ label, value, icon: Icon }) => (
          <Card
            key={label}
            size="sm"
            className="bg-card/80 shadow-sm ring-border/80 backdrop-blur"
          >
            <CardContent className="flex items-center gap-3 py-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Icon className="size-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {label}
                </p>
                <p className="text-2xl font-medium tracking-tight text-foreground/85">
                  {value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 h-px bg-border/70" />

      <div className="flex flex-col gap-3">
        {alerts.map((alert) => {
          const platformTheme =
            PLATFORM_THEMES[alert.apiKey.platform] ?? PLATFORM_THEMES.Other
          const isPending = pendingId === alert.id

          return (
            <Card
              key={alert.id}
              className="overflow-visible border-l-4 bg-card/85 shadow-sm ring-border/80 transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:bg-accent/40 hover:shadow-md"
              style={{ borderLeftColor: platformTheme.accent }}
            >
              <CardContent className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold"
                    style={{
                      color: platformTheme.accent,
                      backgroundColor: platformTheme.soft,
                      borderColor: platformTheme.soft,
                    }}
                  >
                    {platformTheme.initial}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold tracking-tight">
                        {alert.apiKey.name}
                      </p>
                      <Badge
                        variant="outline"
                        className="h-6 rounded-full border-border/80 bg-muted/60 px-2.5 text-[11px] font-medium text-muted-foreground"
                      >
                        {formatEnvironment(alert.apiKey.environment)}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{alert.apiKey.platform}</span>
                      {alert.apiKey.projectTag ? (
                        <>
                          <span className="text-muted-foreground/50">/</span>
                          <span>{alert.apiKey.projectTag}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:items-end">
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <Badge
                      variant="outline"
                      className="h-6 rounded-full border-border/80 bg-muted/60 px-2.5 text-[11px] font-medium text-muted-foreground"
                    >
                      {formatAlertType(alert.type)}
                    </Badge>
                    <Badge
                      className={
                        alert.triggered
                          ? "bg-destructive/10 text-destructive hover:bg-destructive/10"
                          : "bg-[color:var(--platform-openai-soft)] text-[color:var(--platform-openai)] hover:bg-[color:var(--platform-openai-soft)]"
                      }
                    >
                      {alert.triggered ? "Triggered" : "Watching"}
                    </Badge>
                  </div>

                  <p className="text-sm font-medium text-foreground/90">
                    {formatThreshold(alert)}
                  </p>

                  <div className="flex items-center gap-2 self-end">
                    {alert.triggered ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleReset(alert.id)}
                        disabled={isPending}
                        className="rounded-xl"
                      >
                        Reset
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(alert.id)}
                      disabled={isPending}
                      className="rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Delete alert"
                      title="Delete alert"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}
