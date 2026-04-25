export interface UsageData {
  date: Date
  calls: number
  cost: number
  tokens?: number
}

export interface ConnectorResult {
  success: boolean
  synced?: number
  error?: string
  meta?: Record<string, unknown>
}

export interface UsageFetchResult {
  usage: UsageData[]
  meta?: Record<string, unknown>
}

export type ConnectorCollectionMethod =
  | "billing_api"
  | "provider_api"
  | "local_logs"
  | "manual"
  | "proxy"

export type ConnectorAccuracy =
  | "exact"
  | "estimated"
  | "provider_aggregate"
  | "manual"

export interface ConnectorCapabilities {
  collectionMethod: ConnectorCollectionMethod
  accuracy: ConnectorAccuracy
  granularity: "request" | "day" | "account" | "manual" | "unknown"
  supportsCost: boolean
  supportsTokens: boolean
  supportsModels: boolean
  requiresAdminKey: boolean
  privacyNote: string
}

export interface Connector {
  platform: string
  canSync: boolean
  canValidate: boolean
  capabilities: ConnectorCapabilities
  fetchUsage?: (
    apiKey: string,
    days: number
  ) => Promise<UsageData[] | UsageFetchResult>
  validateKey?: (apiKey: string) => Promise<boolean>
}

export interface ConnectorInfo {
  platform: string
  canSync: boolean
  canValidate: boolean
  capabilities: ConnectorCapabilities
}
