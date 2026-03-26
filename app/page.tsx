import { db } from "@/lib/db"
import { VaultView } from "@/components/vault-view"

export default async function Home() {
  const keys = await db.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    include: { usageLogs: { orderBy: { date: "desc" }, take: 7 } }
  })

  return <VaultView keys={keys} />
}
