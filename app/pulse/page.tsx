import { PulseView } from "@/components/pulse-view"
import { KoshShell } from "@/components/kosh-shell"
import { db } from "@/lib/db"

export default async function PulsePage() {
  const keys = await db.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    include: { usageLogs: { orderBy: { date: "desc" } } },
  })

  return (
    <KoshShell>
      <PulseView keys={keys} />
    </KoshShell>
  )
}
