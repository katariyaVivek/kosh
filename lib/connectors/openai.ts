import { eachDayOfInterval, format, startOfDay, subDays } from "date-fns"

import type { Connector, UsageData } from "./types"

type OpenAIUsagePayload = {
  data?: Array<{
    n_generated_tokens_total?: number
    n_requests?: number
    total_cost?: number
  }>
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0)

  return Number.isFinite(parsed) ? parsed : 0
}

export const openaiConnector: Connector = {
  platform: "OpenAI",
  canSync: true,
  canValidate: true,
  async fetchUsage(apiKey, days) {
    const today = startOfDay(new Date())
    const usage: UsageData[] = []
    const daysToSync = eachDayOfInterval({
      start: subDays(today, days - 1),
      end: today,
    })

    for (const day of daysToSync) {
      const dateKey = format(day, "yyyy-MM-dd")
      const response = await fetch(
        `https://api.openai.com/v1/usage?date=${dateKey}`,
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

      const payload = (await response.json()) as OpenAIUsagePayload
      const entries = Array.isArray(payload.data) ? payload.data : []

      usage.push({
        date: day,
        calls: entries.reduce((sum, entry) => sum + toNumber(entry.n_requests), 0),
        cost: entries.reduce((sum, entry) => sum + toNumber(entry.total_cost), 0),
        tokens:
          entries.reduce(
            (sum, entry) => sum + toNumber(entry.n_generated_tokens_total),
            0
          ) || undefined,
      })
    }

    return usage
  },
  async validateKey(apiKey) {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    })

    return response.ok
  },
}
