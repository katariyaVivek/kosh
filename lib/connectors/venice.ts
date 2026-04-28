import type { Connector } from "./types"
import { validationOnlyCapabilities } from "./capabilities"

export const veniceConnector: Connector = {
  platform: "Venice AI",
  canSync: false,
  canValidate: true,
  capabilities: validationOnlyCapabilities,
  validateKey: async (apiKey: string) => {
    const res = await fetch("https://api.venice.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    return res.status === 200
  },
}
