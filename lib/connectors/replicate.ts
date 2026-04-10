import type { Connector, UsageData } from "./types"
import { eachDay, formatDate, toNumber, fetchWithRetry } from "./utils"

type ReplicateUsagePayload = {
  results?: Array<{
    created_at?: string
    total_cost?: number
    model?: string
    status?: string
  }>
}

export const replicateConnector: Connector = {
  platform: "Replicate",
  canSync: true,
  canValidate: true,

  async fetchUsage(apiKey, days) {
    const usage: UsageData[] = []
    const daysToSync = eachDay(days)

    for (const day of daysToSync) {
      const dateKey = formatDate(day)
      const response = await fetchWithRetry(
        `https://api.replicate.com/v1/predictions?created_at__gte=${dateKey}T00:00:00Z&created_at__lt=${dateKey}T23:59:59Z`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          cache: "no-store",
        }
      )

      if (response.status === 401 || response.status === 403) {
        throw new Error("Invalid API key")
      }

      if (!response.ok) {
        throw new Error("Sync failed")
      }

      const payload = (await response.json()) as ReplicateUsagePayload
      const entries = Array.isArray(payload.results) ? payload.results : []

      // Replicate costs are in USD, approximate call count from predictions
      usage.push({
        date: day,
        calls: entries.length,
        cost: entries.reduce((sum, entry) => sum + toNumber(entry.total_cost), 0),
      })
    }

    return usage
  },

  async validateKey(apiKey) {
    const response = await fetchWithRetry("https://api.replicate.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    })

    return response.ok
  },
}
