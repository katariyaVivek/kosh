import type { Connector } from "./types"

export const anthropicConnector: Connector = {
  platform: "Anthropic",
  canSync: false,
  canValidate: true,
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
