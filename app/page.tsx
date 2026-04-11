import { addMonths, startOfMonth } from "date-fns"
import { BellRing, Clock, DollarSign, Key } from "lucide-react"

import { DashboardKeyRow, DashboardKeyTable } from "@/components/dashboard-key-table"
import { DashboardChart } from "@/components/dashboard-chart"
import { KoshShell } from "@/components/kosh-shell"
import { OnboardingTour } from "@/components/onboarding-tour"
import { Card } from "@/components/ui/card"
import { getRotationStatus, needsRotationAttention } from "@/lib/rotation"
import { cn } from "@/lib/utils"
import { db } from "@/lib/db"
import { EmptyState } from "@/components/empty-state"

export const dynamic = "force-dynamic"

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
})

export default async function Home() {
  const now = new Date()
  const windowStart = startOfMonth(now)
  const nextMonthStart = addMonths(windowStart, 1)

  const [keys, monthlySpendAggregate, activeAlerts] =
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
    ])
  const rotationDue = keys.filter((key) =>
    needsRotationAttention(getRotationStatus(key, now).state)
  ).length

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
      label: "Rotation Due",
      value: rotationDue,
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
    createdAt: key.createdAt.toISOString(),
    rotationIntervalDays: key.rotationIntervalDays,
    rotationReminderDays: key.rotationReminderDays,
    lastRotatedAt: key.lastRotatedAt ? key.lastRotatedAt.toISOString() : null,
  }))

  return (
    <KoshShell>
      <div data-tour="dashboard" className="flex flex-col gap-8">
        <div className="space-y-1 border-b border-border pb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time overview of your API keys and usage.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
{stats.map(({ label, value, icon: Icon }) => {
          const isWarning = label === "Rotation Due" && typeof value === "number" && value > 0
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

        <DashboardChart />

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
