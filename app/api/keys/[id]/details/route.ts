import { addDays, format, startOfDay, subDays } from "date-fns"
import { NextResponse } from "next/server"

import { db } from "@/lib/db"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: "Key id is required" }, { status: 400 })
  }

  const key = await db.apiKey.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      platform: true,
      projectTag: true,
      environment: true,
      createdAt: true,
    },
  })

  if (!key) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 })
  }

  const usageLogs = await db.usageLog.findMany({
    where: { apiKeyId: id },
    orderBy: { date: "desc" },
    take: 7,
  })

  const totalAggregate = await db.usageLog.aggregate({
    _sum: { calls: true, cost: true },
    where: { apiKeyId: id },
  })

  const now = new Date()
  const today = startOfDay(now)
  const tomorrow = addDays(today, 1)
  const thisWeekStart = subDays(today, 6)
  const lastWeekStart = subDays(today, 13)
  const lastWeekEnd = subDays(today, 6)

  const [thisWeekAggregate, lastWeekAggregate] = await Promise.all([
    db.usageLog.aggregate({
      _sum: { calls: true },
      where: {
        apiKeyId: id,
        date: {
          gte: thisWeekStart,
          lt: tomorrow,
        },
      },
    }),
    db.usageLog.aggregate({
      _sum: { calls: true },
      where: {
        apiKeyId: id,
        date: {
          gte: lastWeekStart,
          lt: lastWeekEnd,
        },
      },
    }),
  ])

  return NextResponse.json({
    key,
    usageLogs: usageLogs.map((log) => ({
      id: log.id,
      calls: log.calls,
      cost: log.cost,
      date: format(log.date, "yyyy-MM-dd"),
    })),
    totalCalls: totalAggregate._sum.calls ?? 0,
    totalCost: totalAggregate._sum.cost ?? 0,
    thisWeekCalls: thisWeekAggregate._sum.calls ?? 0,
    lastWeekCalls: lastWeekAggregate._sum.calls ?? 0,
  })
}
