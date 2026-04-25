import type { Connector } from "./types"
import { validationOnlyCapabilities } from "./capabilities"

export const anthropicConnector: Connector = {
  platform: "Anthropic",
  canSync: false,
  canValidate: true,
  capabilities: {
    ...validationOnlyCapabilities,
    privacyNote: "Normal Anthropic keys can be validated here; usage sync should use a separate Admin API source.",
  },
  async validateKey(apiKey) {
    const response = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      cache: "no-store",
    })

    return response.ok
  },
}
