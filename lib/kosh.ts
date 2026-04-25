export type KoshKey = {
  id: string
  name: string
  platform: string
  projectTag: string | null
  environment: string
  expiresAt?: string | Date | null
  rotationIntervalDays?: number | null
  rotationReminderDays?: number
  lastRotatedAt?: string | Date | null
  createdAt: string | Date
  notes?: string | null
}

export type KoshUsageLog = {
  id: string
  apiKeyId: string
  calls: number
  cost: number
  tokens: number | null
  date: string | Date
}

export type KoshAlert = {
  id: string
  apiKeyId: string | null
  usageSourceId: string | null
  type: string
  threshold: number
  triggered: boolean
  createdAt: string | Date
}

export type KoshUsageSource = {
  id: string
  name: string
  provider: string | null
  sourceType: string
  collectionMethod: string
  accuracy: string
}

export type KoshAlertWithKey = KoshAlert & {
  apiKey: KoshKey | null
  usageSource: KoshUsageSource | null
}

export function formatEnvironment(environment: string) {
  return environment.charAt(0).toUpperCase() + environment.slice(1)
}
