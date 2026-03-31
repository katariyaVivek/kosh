import { addDays, addMonths, startOfMonth } from "date-fns"
import { BellRing, Clock, DollarSign, Key, LayoutDashboard } from "lucide-react"

import { DashboardKeyRow, DashboardKeyTable } from "@/components/dashboard-key-table"
import { KoshShell } from "@/components/kosh-shell"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { db } from "@/lib/db"

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
})

export default async function Home() {
  const now = new Date()
  const windowStart = startOfMonth(now)
  const nextMonthStart = addMonths(windowStart, 1)
  const nextWeek = addDays(now, 7)

  const [keys, monthlySpendAggregate, activeAlerts, expiringSoon] =
    await Promise.all([
      db.apiKey.findMany({
        orderBy: { createdAt: "desc" },
        include: { usageLogs: { orderBy: { date: "desc" }, take: 1 } },
      }),
      db.usageLog.aggregate({
        _sum: { cost: true },
        where: { date: { gte: windowStart, lt: nextMonthStart } },
      }),
      db.alert.count({ where: { triggered: true } }),
      db.apiKey.count({
        where: {
          expiresAt: {
            gte: now,
            lte: nextWeek,
          },
        },
      }),
    ])

  const totalKeys = keys.length
  const monthlySpend = monthlySpendAggregate._sum.cost ?? 0
  const stats = [
    {
      label: "Total Keys",
      value: totalKeys,
      icon: Key,
    },
    {
      label: "Monthly Spend",
      value: currencyFormatter.format(monthlySpend),
      icon: DollarSign,
    },
    {
      label: "Active Alerts",
      value: activeAlerts,
      icon: BellRing,
      hasWarning: activeAlerts > 0,
    },
    {
      label: "Expiring Soon",
      value: expiringSoon,
      icon: Clock,
    },
  ]

  const tableKeys: DashboardKeyRow[] = keys.map((key) => ({
    id: key.id,
    name: key.name,
    platform: key.platform,
    environment: key.environment,
    lastLog: key.usageLogs[0]?.date?.toISOString() ?? null,
    expiresAt: key.expiresAt ? key.expiresAt.toISOString() : null,
  }))

  return (
    <KoshShell>
      <div className="flex flex-col gap-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Real-time overview of your API keys and usage.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, hasWarning }) => {
          const highlightExpiring =
            label === "Expiring Soon" && typeof value === "number" && value > 0

          return (
            <Card
              key={label}
              size="sm"
              className={cn(
                "bg-card/80 shadow-sm ring-border/70 backdrop-blur",
                highlightExpiring && "bg-amber-400/10 ring-amber-300/50"
              )}
            >
              <CardContent className="flex items-center gap-3 py-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-0.5">
                  <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {label}
                    {hasWarning ? (
                      <span className="size-2 rounded-full bg-destructive" />
                    ) : null}
                  </p>
                  <p className="text-2xl font-medium tracking-tight">
                    <span
                      className={cn(
                        highlightExpiring ? "text-amber-400" : "text-foreground/85"
                      )}
                    >
                      {value}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
        </div>

        {tableKeys.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border/70 bg-card/70 px-10 py-12 text-center shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground/70">
                <LayoutDashboard className="size-12 text-muted-foreground/70" />
              </div>
              <p className="text-xl font-semibold tracking-tight">
                No API keys yet
              </p>
              <p className="text-sm text-muted-foreground">
                Add your first key to get started
              </p>
            </div>
          </div>
        ) : (
          <DashboardKeyTable keys={tableKeys} />
        )}
      </div>
    </KoshShell>
  )
}
