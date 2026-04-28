import type { Connector, UsageData } from "./types"
import { eachDay, formatDate, toNumber } from "./utils"
import { providerAggregateCapabilities } from "./capabilities"

type DeepSeekDailyCost = {
  timestamp?: number
  line_items?: Array<{ name?: string; cost?: number }>
}

type DeepSeekUsagePayload = {
  total_usage?: number
  daily_costs?: DeepSeekDailyCost[]
}

export const deepseekConnector: Connector = {
  platform: "DeepSeek",
  canSync: true,
  canValidate: true,
  capabilities: {
    ...providerAggregateCapabilities,
    supportsTokens: false,
    supportsModels: false,
  },
  async fetchUsage(apiKey, days) {
    const usage: UsageData[] = []
    const daysToSync = eachDay(days)

    for (const day of daysToSync) {
      const dateKey = formatDate(day)
      const response = await fetch(
        `https://api.deepseek.com/dashboard/billing/usage?start_date=${dateKey}&end_date=${dateKey}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          cache: "no-store",
        }
      )

      if (response.status === 401 || response.status === 403) {
        throw new Error("Invalid API key")
      }

      if (!response.ok) {
        throw new Error("Sync failed")
      }

      const payload = (await response.json()) as DeepSeekUsagePayload

      usage.push({
        date: day,
        calls: 1,
        cost: toNumber(payload.total_usage),
      })
    }

    return usage
  },
  async validateKey(apiKey) {
    const res = await fetch("https://api.deepseek.com/user/balance", {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    return res.status === 200
  },
}
