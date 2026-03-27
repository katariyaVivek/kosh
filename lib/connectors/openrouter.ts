import { startOfDay } from "date-fns"

import type { Connector, UsageData, UsageFetchResult } from "./types"

type OpenRouterKeyPayload = {
  data?: {
    calls?: number
    limit?: number | null
    rate_limit?: {
      interval?: string
      requests?: number
    }
    requests?: number
    usage?: number
    usage_count?: number
  }
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0)

  return Number.isFinite(parsed) ? parsed : 0
}

export const openrouterConnector: Connector = {
  platform: "OpenRouter",
  canSync: true,
  canValidate: true,
  async fetchUsage(apiKey, _days) {
    void _days
    const response = await fetch("https://openrouter.ai/api/v1/key", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    })

    if (response.status === 401 || response.status === 403) {
      throw new Error("Invalid API key")
    }

    if (!response.ok) {
      throw new Error("Sync failed")
    }

    const today = startOfDay(new Date())
    const payload = (await response.json()) as OpenRouterKeyPayload
    const actualCalls =
      payload.data?.usage_count ?? payload.data?.requests ?? payload.data?.calls
    const isFreePlan =
      toNumber(payload.data?.usage) === 0 && payload.data?.limit === null
    const usage: UsageData[] = [
      {
        date: today,
        calls: isFreePlan ? 0 : toNumber(actualCalls),
        cost: toNumber(payload.data?.usage),
      },
    ]

    const result: UsageFetchResult = {
      usage,
      meta: {
        freeplan: isFreePlan,
      },
    }

    return result
  },
  async validateKey(apiKey) {
    const response = await fetch("https://openrouter.ai/api/v1/key", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    })

    return response.ok
  },
}
