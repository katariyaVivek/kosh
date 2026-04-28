import type { Connector } from "./types"
import { validationOnlyCapabilities } from "./capabilities"

export const cerebrasConnector: Connector = {
  platform: "Cerebras",
  canSync: false,
  canValidate: true,
  capabilities: validationOnlyCapabilities,
  validateKey: async (apiKey: string) => {
    const res = await fetch("https://api.cerebras.ai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    return res.status === 200
  },
}
