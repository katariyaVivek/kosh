import { addDays, addMonths, startOfMonth } from "date-fns"
import { BellRing, Clock, DollarSign, Key, LayoutDashboard } from "lucide-react"

import { DashboardKeyRow, DashboardKeyTable } from "@/components/dashboard-key-table"
import { KoshShell } from "@/components/kosh-shell"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
        <div className="space-y-1 border-b border-border pb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time overview of your API keys and usage.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, hasWarning }) => {
          const isWarning = label === "Expiring Soon" && typeof value === "number" && value > 0
          return (
            <Card
              key={label}
              className={cn(
                "bg-card border border-border shadow-sm rounded-xl p-6",
                isWarning && "ring-1 ring-amber-200"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    {label}
                  </p>
                  <p className={cn(
                    "text-3xl font-semibold tracking-tight",
                    isWarning ? "text-amber-500" : "text-foreground"
                  )}>
                    {value}
                  </p>
                </div>
                <Icon className="size-4 text-muted-foreground" />
              </div>
            </Card>
          )
        })}
        </div>

        {tableKeys.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <div className="mx-auto flex max-w-sm flex-col items-center rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
              <LayoutDashboard className="size-10 text-muted-foreground/40" />
              <h1 className="mt-4 text-sm font-medium text-foreground">
                No API keys yet
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first key to get started
              </p>
              <Button className="mt-4 text-sm">Add key</Button>
            </div>
          </div>
        ) : (
          <DashboardKeyTable keys={tableKeys} />
        )}
      </div>
    </KoshShell>
  )
}
