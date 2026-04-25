import { AlertsView } from "@/components/alerts-view"
import { KoshShell } from "@/components/kosh-shell"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

async function syncTriggeredAlerts() {
  const alerts = await db.alert.findMany({
    where: { triggered: false },
    include: {
      apiKey: {
        include: {
          usageLogs: {
            select: {
              calls: true,
              cost: true,
            },
          },
        },
      },
      usageSource: {
        include: {
          usageDailyRollups: {
            select: {
              calls: true,
              cost: true,
              totalTokens: true,
            },
          },
        },
      },
    },
  })

  await Promise.all(
    alerts.map(async (alert) => {
      const usageLogs = alert.apiKey?.usageLogs ?? []
      const sourceRollups = alert.usageSource?.usageDailyRollups ?? []
      const totalCalls =
        usageLogs.reduce((sum, log) => sum + log.calls, 0) +
        sourceRollups.reduce((sum, rollup) => sum + rollup.calls, 0)
      const totalCost =
        usageLogs.reduce((sum, log) => sum + log.cost, 0) +
        sourceRollups.reduce((sum, rollup) => sum + rollup.cost, 0)
      const totalTokens = sourceRollups.reduce(
        (sum, rollup) => sum + (rollup.totalTokens ?? 0),
        0
      )

      const hasTriggered =
        alert.type === "cost"
          ? totalCost >= alert.threshold
          : alert.type === "tokens"
            ? totalTokens >= alert.threshold
            : totalCalls >= alert.threshold

      if (hasTriggered) {
        await db.alert.update({
          where: { id: alert.id },
          data: { triggered: true },
        })
      }
    })
  )
}

export default async function AlertsPage() {
  await syncTriggeredAlerts()

  const [alerts, keys, usageSources] = await Promise.all([
    db.alert.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        apiKey: true,
        usageSource: true,
      },
    }),
    db.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
    db.usageSource.findMany({
      where: { sourceType: "local_tool" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, provider: true },
    }),
  ])

  return (
    <KoshShell sidebarAction={{ kind: "alert", keys, usageSources }}>
      <AlertsView alerts={alerts} />
    </KoshShell>
  )
}
