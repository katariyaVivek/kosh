import type { Connector } from "./types"
import { fetchWithRetry } from "./utils"

// Mistral does not expose a usage/cost API, so we can only validate keys.
export const mistralConnector: Connector = {
  platform: "Mistral",
  canSync: false,
  canValidate: true,

  async validateKey(apiKey) {
    const response = await fetchWithRetry("https://api.mistral.ai/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    })

    return response.ok
  },
}
