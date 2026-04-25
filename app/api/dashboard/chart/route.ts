import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { addDays, startOfDay, subDays } from "date-fns"

export const dynamic = "force-dynamic"

export async function GET() {
  const now = new Date()
  const windowStart = startOfDay(subDays(now, 29))
  const windowEnd = addDays(startOfDay(now), 1)

  const allRollups = await db.usageDailyRollup.findMany({
    orderBy: { rollupDate: "asc" },
  })

  const usageRollups = allRollups.filter((rollup) => {
    const rollupDate = new Date(rollup.rollupDate)
    return rollupDate >= windowStart && rollupDate < windowEnd
  })

  const toKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  const toLabel = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" })

  const grouped = new Map<string, { cost: number; calls: number }>()
  for (const rollup of usageRollups) {
    const rollupDate = new Date(rollup.rollupDate)
    const key = toKey(rollupDate)
    const existing = grouped.get(key)
    grouped.set(key, {
      cost: (existing?.cost ?? 0) + Number(rollup.cost ?? 0),
      calls: (existing?.calls ?? 0) + Number(rollup.calls ?? 0),
    })
  }

  const daysInWindow = Math.ceil((windowEnd.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24))
  const result = Array.from({ length: daysInWindow }).map((_, idx) => {
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
