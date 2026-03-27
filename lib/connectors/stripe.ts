import { eachDayOfInterval, format, startOfDay, subDays } from "date-fns"

import type { Connector, UsageData } from "./types"

type StripeChargesPayload = {
  data?: Array<{
    amount?: number
    created?: number
  }>
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0)

  return Number.isFinite(parsed) ? parsed : 0
}

function toBasicAuth(apiKey: string) {
  return `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`
}

export const stripeConnector: Connector = {
  platform: "Stripe",
  canSync: true,
  canValidate: true,
  async fetchUsage(apiKey, days) {
    const response = await fetch("https://api.stripe.com/v1/charges?limit=100", {
      headers: {
        Authorization: toBasicAuth(apiKey),
      },
      cache: "no-store",
    })

    if (response.status === 401 || response.status === 403) {
      throw new Error("Invalid API key")
    }

    if (!response.ok) {
      throw new Error("Sync failed")
    }

    const payload = (await response.json()) as StripeChargesPayload
    const charges = Array.isArray(payload.data) ? payload.data : []
    const today = startOfDay(new Date())
    const groupedCharges = charges.reduce<Record<string, { calls: number; cost: number }>>(
      (acc, charge) => {
        const createdAt = new Date(toNumber(charge.created) * 1000)
        const dayKey = format(startOfDay(createdAt), "yyyy-MM-dd")

        acc[dayKey] = {
          calls: (acc[dayKey]?.calls ?? 0) + 1,
          cost: (acc[dayKey]?.cost ?? 0) + toNumber(charge.amount) / 100,
        }

        return acc
      },
      {}
    )

    return eachDayOfInterval({
      start: subDays(today, days - 1),
      end: today,
    }).map<UsageData>((day) => {
      const dayKey = format(day, "yyyy-MM-dd")
      const value = groupedCharges[dayKey]

      return {
        date: day,
        calls: value?.calls ?? 0,
        cost: value?.cost ?? 0,
      }
    })
  },
  async validateKey(apiKey) {
    const response = await fetch("https://api.stripe.com/v1/balance", {
      headers: {
        Authorization: toBasicAuth(apiKey),
      },
      cache: "no-store",
    })

    return response.ok
  },
}
