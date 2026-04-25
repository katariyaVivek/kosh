import { db } from "@/lib/db"

export type QuotaWindowInput = {
  usedPercent?: number | null
  windowMinutes?: number | null
  resetsAt?: Date | null
  resetDescription?: string | null
}

export type QuotaSnapshotInput = {
  provider: string
  sourceType: string
  name: string
  collectionMethod: string
  accuracy: string
  privacyNote?: string | null
  sourceLabel: string
  status: "ok" | "unavailable" | "error" | "auth_found"
  accountEmail?: string | null
  accountPlan?: string | null
  primary?: QuotaWindowInput | null
  secondary?: QuotaWindowInput | null
  creditsRemaining?: number | null
  hasCredits?: boolean | null
  unlimited?: boolean | null
  error?: string | null
  metadata?: Record<string, unknown>
}

function stringifyMetadata(metadata?: Record<string, unknown>) {
  return metadata ? JSON.stringify(metadata) : null
}

async function getOrCreateQuotaSource(input: QuotaSnapshotInput) {
  const existing = await db.usageSource.findFirst({
    where: {
      apiKeyId: null,
      sourceType: input.sourceType,
      provider: input.provider,
      collectionMethod: input.collectionMethod,
    },
  })

  if (existing) {
    return db.usageSource.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        accuracy: input.accuracy,
        privacyNote: input.privacyNote ?? null,
        metadataJson: stringifyMetadata(input.metadata),
      },
    })
  }

  return db.usageSource.create({
    data: {
      name: input.name,
      sourceType: input.sourceType,
      provider: input.provider,
      collectionMethod: input.collectionMethod,
      accuracy: input.accuracy,
      privacyNote: input.privacyNote ?? null,
      metadataJson: stringifyMetadata(input.metadata),
    },
  })
}

export async function recordQuotaSnapshot(input: QuotaSnapshotInput) {
  const usageSource = await getOrCreateQuotaSource(input)

  const snapshot = await db.usageQuotaSnapshot.create({
    data: {
      usageSourceId: usageSource.id,
      provider: input.provider,
      sourceLabel: input.sourceLabel,
      status: input.status,
      accountEmail: input.accountEmail ?? null,
      accountPlan: input.accountPlan ?? null,
      primaryUsedPercent: input.primary?.usedPercent ?? null,
      primaryWindowMinutes: input.primary?.windowMinutes ?? null,
      primaryResetsAt: input.primary?.resetsAt ?? null,
      primaryResetDescription: input.primary?.resetDescription ?? null,
      secondaryUsedPercent: input.secondary?.usedPercent ?? null,
      secondaryWindowMinutes: input.secondary?.windowMinutes ?? null,
      secondaryResetsAt: input.secondary?.resetsAt ?? null,
      secondaryResetDescription: input.secondary?.resetDescription ?? null,
      creditsRemaining: input.creditsRemaining ?? null,
      hasCredits: input.hasCredits ?? null,
      unlimited: input.unlimited ?? null,
      error: input.error ?? null,
      metadataJson: stringifyMetadata(input.metadata),
    },
  })

  return { usageSource, snapshot }
}
