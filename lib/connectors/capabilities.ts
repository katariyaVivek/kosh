import type { ConnectorCapabilities } from "./types"

export const providerAggregateCapabilities: ConnectorCapabilities = {
  collectionMethod: "provider_api",
  accuracy: "provider_aggregate",
  granularity: "day",
  supportsCost: true,
  supportsTokens: true,
  supportsModels: false,
  requiresAdminKey: false,
  privacyNote: "Fetches provider usage totals without storing prompts or responses.",
}

export const validationOnlyCapabilities: ConnectorCapabilities = {
  collectionMethod: "manual",
  accuracy: "manual",
  granularity: "manual",
  supportsCost: false,
  supportsTokens: false,
  supportsModels: false,
  requiresAdminKey: false,
  privacyNote: "Kosh can validate this key, but usage must be entered manually.",
}

export const manualCapabilities: ConnectorCapabilities = {
  collectionMethod: "manual",
  accuracy: "manual",
  granularity: "manual",
  supportsCost: true,
  supportsTokens: true,
  supportsModels: false,
  requiresAdminKey: false,
  privacyNote: "Usage is based on values you enter manually.",
}
