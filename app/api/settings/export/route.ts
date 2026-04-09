import { format } from "date-fns"
import { NextResponse } from "next/server"

import { db } from "@/lib/db"

export async function GET() {
  const [keys, usageLogs, alerts] = await Promise.all([
    db.apiKey.findMany({
      select: {
        id: true,
        name: true,
        platform: true,
        projectTag: true,
        environment: true,
        expiresAt: true,
        rotationIntervalDays: true,
        rotationReminderDays: true,
        lastRotatedAt: true,
        createdAt: true,
        notes: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    db.usageLog.findMany({
      select: {
        apiKeyId: true,
        calls: true,
        cost: true,
        tokens: true,
        date: true,
      },
      orderBy: { date: "asc" },
    }),
    db.alert.findMany({
      select: {
        apiKeyId: true,
        type: true,
        threshold: true,
        triggered: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ])

  const payload = {
    exportedAt: new Date().toISOString(),
    version: "1.1",
    keys: keys.map((key) => ({
      ...key,
      expiresAt: key.expiresAt?.toISOString() ?? null,
      lastRotatedAt: key.lastRotatedAt?.toISOString() ?? null,
      createdAt: key.createdAt.toISOString(),
    })),
    usageLogs: usageLogs.map((log) => ({
      ...log,
      date: log.date.toISOString(),
    })),
    alerts,
  }

  const body = JSON.stringify(payload, null, 2)
  const filename = `kosh-export-${format(new Date(), "yyyy-MM-dd")}.json`

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  })
}
