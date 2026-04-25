import type { Connector } from "./types"
import { validationOnlyCapabilities } from "./capabilities"

export const xaiConnector: Connector = {
  platform: "xAI",
  canSync: false,
  canValidate: true,
  capabilities: validationOnlyCapabilities,
  validateKey: async (apiKey: string) => {
    const res = await fetch("https://api.x.ai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    return res.status === 200
  },
}
