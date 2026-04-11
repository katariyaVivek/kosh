import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { addMonths, startOfMonth } from "date-fns"

export const dynamic = "force-dynamic"

export async function GET() {
  const now = new Date()
  const windowStart = startOfMonth(now)
  const windowEnd = addMonths(windowStart, 1)

  // Fetch all logs and filter in JS for SQLite date compatibility
  const allLogs = await db.usageLog.findMany({
    orderBy: { date: "asc" },
  })

  const usageLogs = allLogs.filter((log) => {
    const logDate = new Date(log.date)
    return logDate >= windowStart && logDate < windowEnd
  })

  const toKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  const toLabel = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" })

  const grouped = new Map<string, { cost: number; calls: number }>()
  for (const log of usageLogs) {
    const logDate = new Date(log.date)
    const key = toKey(logDate)
    const existing = grouped.get(key)
    grouped.set(key, {
      cost: (existing?.cost ?? 0) + Number(log.cost ?? 0),
      calls: (existing?.calls ?? 0) + Number(log.calls ?? 0),
    })
  }

  // Build result for days in the current month
  const daysInMonth = Math.ceil((windowEnd.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24))
  const result = Array.from({ length: daysInMonth }).map((_, idx) => {
    const date = new Date(windowStart)
    date.setDate(windowStart.getDate() + idx)
    const key = toKey(date)
    return {
      date: toLabel(date),
      cost: grouped.get(key)?.cost ?? 0,
      calls: grouped.get(key)?.calls ?? 0,
    }
  })

  return NextResponse.json(result)
}
