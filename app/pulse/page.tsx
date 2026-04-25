import { PulseView } from "@/components/pulse-view"
import { KoshShell } from "@/components/kosh-shell"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function PulsePage() {
  const [keys, usageSources] = await Promise.all([
    db.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      include: { usageLogs: { orderBy: { date: "desc" } } },
    }),
    db.usageSource.findMany({
      where: { sourceType: "local_tool" },
      orderBy: { updatedAt: "desc" },
      include: { usageDailyRollups: { orderBy: { rollupDate: "desc" } } },
    }),
  ])

  return (
    <KoshShell>
      <PulseView keys={keys} usageSources={usageSources} />
    </KoshShell>
  )
}
