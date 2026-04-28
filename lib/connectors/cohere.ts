import type { Connector } from "./types"
import { validationOnlyCapabilities } from "./capabilities"

export const cohereConnector: Connector = {
  platform: "Cohere",
  canSync: false,
  canValidate: true,
  capabilities: validationOnlyCapabilities,
  validateKey: async (apiKey: string) => {
    const res = await fetch("https://api.cohere.ai/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })
    return res.status === 200
  },
}
