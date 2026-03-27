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

export interface Connector {
  platform: string
  canSync: boolean
  canValidate: boolean
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
}
