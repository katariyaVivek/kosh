import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  const now = new Date()
  const startDate = new Date(now)
  startDate.setHours(0, 0, 0, 0)
  startDate.setDate(startDate.getDate() - 29)

  // Fetch all usage logs and filter in JS to handle SQLite date format quirks
  const allLogs = await db.usageLog.findMany({
    orderBy: { date: "asc" },
  })

  // Filter to last 30 days in JS for reliability
  const usageLogs = allLogs.filter((log) => {
    const logDate = new Date(log.date)
    return logDate >= startDate && logDate <= now
  })

  const toKey = (date: Date) => date.toISOString().split("T")[0]
  const toLabel = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" })

  const grouped = new Map<string, { cost: number; calls: number }>()
  for (const log of usageLogs) {
    const key = toKey(log.date)
    const existing = grouped.get(key)
    grouped.set(key, {
      cost: (existing?.cost ?? 0) + Number(log.cost ?? 0),
      calls: (existing?.calls ?? 0) + Number(log.calls ?? 0),
    })
  }

  const result = Array.from({ length: 30 }).map((_, idx) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + idx)
    const key = toKey(date)
    return {
      date: toLabel(date),
      cost: grouped.get(key)?.cost ?? 0,
      calls: grouped.get(key)?.calls ?? 0,
    }
  })

  return NextResponse.json(result)
}
