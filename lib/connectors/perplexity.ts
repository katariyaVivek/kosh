import type { Connector } from "./types"
import { validationOnlyCapabilities } from "./capabilities"

export const perplexityConnector: Connector = {
  platform: "Perplexity",
  canSync: false,
  canValidate: true,
  capabilities: validationOnlyCapabilities,
  validateKey: async (apiKey: string) => {
    const res = await fetch("https://api.perplexity.ai/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    return res.status === 200
  },
}
