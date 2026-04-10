import { eachDayOfInterval, format, startOfDay, subDays } from "date-fns"

export function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export interface DayRangeParams {
  days: number
}

export function eachDay(days: number): Date[] {
  const today = startOfDay(new Date())
  return eachDayOfInterval({
    start: subDays(today, days - 1),
    end: today,
  })
}

export function formatDate(day: Date): string {
  return format(day, "yyyy-MM-dd")
}

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  try {
    const response = await fetch(url, init)

    // Don't retry client errors (4xx)
    if (response.status >= 400 && response.status < 500) {
      return response
    }

    // Retry on server errors (5xx)
    if (response.status >= 500 && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
      return fetchWithRetry(url, init, retries - 1)
    }

    return response
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
      return fetchWithRetry(url, init, retries - 1)
    }
    throw error
  }
}
