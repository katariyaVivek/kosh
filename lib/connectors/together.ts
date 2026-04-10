import type { Connector, UsageData } from "./types"
import { eachDay, formatDate, toNumber, fetchWithRetry } from "./utils"

type TogetherUsagePayload = {
  data?: Array<{
    date?: string
    total_cost?: number
    num_requests?: number
    total_tokens?: number
  }>
}

export const togetherConnector: Connector = {
  platform: "Together AI",
  canSync: true,
  canValidate: true,

  async fetchUsage(apiKey, days) {
    const usage: UsageData[] = []
    const daysToSync = eachDay(days)

    for (const day of daysToSync) {
      const dateKey = formatDate(day)
      const response = await fetchWithRetry(
        `https://api.together.xyz/v1/usage?date=${dateKey}`,
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

      const payload = (await response.json()) as TogetherUsagePayload
      const entries = Array.isArray(payload.data) ? payload.data : []

      usage.push({
        date: day,
        calls: entries.reduce((sum, entry) => sum + toNumber(entry.num_requests), 0),
        cost: entries.reduce((sum, entry) => sum + toNumber(entry.total_cost), 0),
        tokens:
          entries.reduce(
            (sum, entry) => sum + toNumber(entry.total_tokens),
            0
          ) || undefined,
      })
    }

    return usage
  },

  async validateKey(apiKey) {
    const response = await fetchWithRetry("https://api.together.xyz/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    })

    return response.ok
  },
}
