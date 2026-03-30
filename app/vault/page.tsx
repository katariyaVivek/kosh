import { VaultView } from "@/components/vault-view"
import { KoshShell } from "@/components/kosh-shell"
import { db } from "@/lib/db"

export default async function VaultPage() {
  const keys = await db.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    include: { usageLogs: { orderBy: { date: "desc" }, take: 7 } },
  })

  return (
    <KoshShell>
      <VaultView keys={keys} />
    </KoshShell>
  )
}
