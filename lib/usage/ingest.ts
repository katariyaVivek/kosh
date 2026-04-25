import { addDays, format } from "date-fns"

import { db } from "@/lib/db"

export type UsageCollectionMethod =
  | "billing_api"
  | "provider_api"
  | "local_logs"
  | "manual"
  | "proxy"

export type UsageAccuracy =
  | "exact"
  | "estimated"
  | "provider_aggregate"
  | "manual"

export type UsageSourceInput = {
  apiKeyId?: string | null
  name: string
  sourceType: string
  provider?: string | null
  collectionMethod: UsageCollectionMethod
  accuracy: UsageAccuracy
  requiresAdminKey?: boolean
  privacyNote?: string | null
  metadata?: Record<string, unknown>
}

export type UsageSampleInput = {
  externalId?: string
  date: Date
  calls: number
  cost: number
  tokens?: number | null
  inputTokens?: number | null
  outputTokens?: number | null
  model?: string | null
  currency?: string
  metadata?: Record<string, unknown>
}

type LegacyUsageMode = "none" | "create" | "upsert"

type IngestUsageInput = {
  source: UsageSourceInput
  samples: UsageSampleInput[]
  legacyUsageMode?: LegacyUsageMode
}

function stringifyMetadata(metadata?: Record<string, unknown>) {
  return metadata ? JSON.stringify(metadata) : null
}

function getUtcDayBounds(date: Date) {
  const start = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0,
    0,
    0,
    0
  ))

  return {
    start,
    noon: new Date(Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate(),
      12,
      0,
      0,
      0
    )),
    end: addDays(start, 1),
  }
}

function getLogDate(date: Date) {
  const { start, noon, end } = getUtcDayBounds(date)
  const now = new Date()

  return now >= start && now < end ? now : noon
}

function getExternalId(sourceId: string, sample: UsageSampleInput) {
  return (
    sample.externalId ??
    `${sourceId}:${format(sample.date, "yyyy-MM-dd")}:${sample.model ?? "all"}`
  )
}

function getTotalTokens(sample: UsageSampleInput) {
  if (sample.tokens !== undefined && sample.tokens !== null) {
    return sample.tokens
  }

  const total = (sample.inputTokens ?? 0) + (sample.outputTokens ?? 0)

  return total > 0 ? total : null
}

async function getOrCreateUsageSource(source: UsageSourceInput) {
  const existing = await db.usageSource.findFirst({
    where: {
      apiKeyId: source.apiKeyId ?? null,
      sourceType: source.sourceType,
      provider: source.provider ?? null,
      collectionMethod: source.collectionMethod,
    },
  })

  if (existing) {
    return db.usageSource.update({
      where: { id: existing.id },
      data: {
        name: source.name,
        accuracy: source.accuracy,
        requiresAdminKey: source.requiresAdminKey ?? false,
        privacyNote: source.privacyNote ?? null,
        metadataJson: stringifyMetadata(source.metadata),
      },
    })
  }

  return db.usageSource.create({
    data: {
      apiKeyId: source.apiKeyId ?? null,
      name: source.name,
      sourceType: source.sourceType,
      provider: source.provider ?? null,
      collectionMethod: source.collectionMethod,
      accuracy: source.accuracy,
      requiresAdminKey: source.requiresAdminKey ?? false,
      privacyNote: source.privacyNote ?? null,
      metadataJson: stringifyMetadata(source.metadata),
    },
  })
}

async function syncLegacyUsageLog(
  apiKeyId: string,
  sample: UsageSampleInput,
  mode: Exclude<LegacyUsageMode, "none">
) {
  const logDate = getLogDate(sample.date)

  if (mode === "create") {
    await db.usageLog.create({
      data: {
        apiKeyId,
        calls: sample.calls,
        cost: sample.cost,
        tokens: sample.tokens ?? null,
        date: logDate,
      },
    })

    return
  }

  const { start, end } = getUtcDayBounds(sample.date)
  const existingLog = await db.usageLog.findFirst({
    where: {
      apiKeyId,
      date: {
        gte: start,
        lt: end,
      },
    },
    select: { id: true },
  })

  if (existingLog) {
    await db.usageLog.update({
      where: { id: existingLog.id },
      data: {
        calls: sample.calls,
        cost: sample.cost,
        tokens: sample.tokens ?? null,
        date: logDate,
      },
    })

    return
  }

  await db.usageLog.create({
    data: {
      apiKeyId,
      calls: sample.calls,
      cost: sample.cost,
      tokens: sample.tokens ?? null,
      date: logDate,
    },
  })
}

async function updateDailyRollup(
  usageSourceId: string,
  source: UsageSourceInput,
  date: Date
) {
  const { start, end } = getUtcDayBounds(date)
  const aggregate = await db.usageEvent.aggregate({
    _sum: {
      calls: true,
      cost: true,
      inputTokens: true,
      outputTokens: true,
      totalTokens: true,
    },
    where: {
      usageSourceId,
      periodStart: {
        gte: start,
        lt: end,
      },
    },
  })

  await db.usageDailyRollup.upsert({
    where: {
      usageSourceId_rollupDate: {
        usageSourceId,
        rollupDate: start,
      },
    },
    create: {
      usageSourceId,
      apiKeyId: source.apiKeyId ?? null,
      provider: source.provider ?? null,
      currency: "USD",
      calls: aggregate._sum.calls ?? 0,
      cost: aggregate._sum.cost ?? 0,
      inputTokens: aggregate._sum.inputTokens ?? null,
      outputTokens: aggregate._sum.outputTokens ?? null,
      totalTokens: aggregate._sum.totalTokens ?? null,
      accuracy: source.accuracy,
      rollupDate: start,
    },
    update: {
      apiKeyId: source.apiKeyId ?? null,
      provider: source.provider ?? null,
      calls: aggregate._sum.calls ?? 0,
      cost: aggregate._sum.cost ?? 0,
      inputTokens: aggregate._sum.inputTokens ?? null,
      outputTokens: aggregate._sum.outputTokens ?? null,
      totalTokens: aggregate._sum.totalTokens ?? null,
      accuracy: source.accuracy,
    },
  })
}

export async function ingestUsage({
  source,
  samples,
  legacyUsageMode = "none",
}: IngestUsageInput) {
  const usageSource = await getOrCreateUsageSource(source)
  const touchedDays = new Set<string>()

  for (const sample of samples) {
    const { start, end } = getUtcDayBounds(sample.date)
    const totalTokens = getTotalTokens(sample)
    const externalId = getExternalId(usageSource.id, sample)

    await db.usageEvent.upsert({
      where: {
        usageSourceId_externalId: {
          usageSourceId: usageSource.id,
          externalId,
        },
      },
      create: {
        usageSourceId: usageSource.id,
        apiKeyId: source.apiKeyId ?? null,
        externalId,
        sourceType: source.sourceType,
        provider: source.provider ?? null,
        model: sample.model ?? null,
        currency: sample.currency ?? "USD",
        calls: sample.calls,
        inputTokens: sample.inputTokens ?? null,
        outputTokens: sample.outputTokens ?? null,
        totalTokens,
        cost: sample.cost,
        accuracy: source.accuracy,
        periodStart: start,
        periodEnd: end,
        metadataJson: stringifyMetadata(sample.metadata),
      },
      update: {
        model: sample.model ?? null,
        currency: sample.currency ?? "USD",
        calls: sample.calls,
        inputTokens: sample.inputTokens ?? null,
        outputTokens: sample.outputTokens ?? null,
        totalTokens,
        cost: sample.cost,
        accuracy: source.accuracy,
        periodStart: start,
        periodEnd: end,
        metadataJson: stringifyMetadata(sample.metadata),
        capturedAt: new Date(),
      },
    })

    if (source.apiKeyId && legacyUsageMode !== "none") {
      await syncLegacyUsageLog(source.apiKeyId, sample, legacyUsageMode)
    }

    touchedDays.add(format(start, "yyyy-MM-dd"))
  }

  for (const day of touchedDays) {
    await updateDailyRollup(usageSource.id, source, new Date(`${day}T00:00:00.000Z`))
  }

  return {
    usageSource,
    synced: samples.length,
  }
}
