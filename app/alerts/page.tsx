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
    },
  })

  await Promise.all(
    alerts.map(async (alert) => {
      const totalCalls = alert.apiKey.usageLogs.reduce(
        (sum, log) => sum + log.calls,
        0
      )
      const totalCost = alert.apiKey.usageLogs.reduce(
        (sum, log) => sum + log.cost,
        0
      )

      const hasTriggered =
        alert.type === "cost"
          ? totalCost >= alert.threshold
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

  const [alerts, keys] = await Promise.all([
    db.alert.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        apiKey: true,
      },
    }),
    db.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
  ])

  return (
    <KoshShell sidebarAction={{ kind: "alert", keys }}>
      <AlertsView alerts={alerts} />
    </KoshShell>
  )
}
