import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  const now = new Date()
  const startDate = new Date(now)
  startDate.setHours(0, 0, 0, 0)
  startDate.setDate(startDate.getDate() - 29)

  const usageLogs = await db.usageLog.findMany({
    where: { date: { gte: startDate, lte: now } },
    orderBy: { date: "asc" },
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
