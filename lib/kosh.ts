export type KoshKey = {
  id: string
  name: string
  platform: string
  projectTag: string | null
  environment: string
  expiresAt?: string | Date | null
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
  apiKeyId: string
  type: string
  threshold: number
  triggered: boolean
  createdAt: string | Date
}

export type KoshAlertWithKey = KoshAlert & {
  apiKey: KoshKey
}

export function formatEnvironment(environment: string) {
  return environment.charAt(0).toUpperCase() + environment.slice(1)
}
