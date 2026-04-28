import type { Connector } from "./types"
import { validationOnlyCapabilities } from "./capabilities"

export const deepinfraConnector: Connector = {
  platform: "DeepInfra",
  canSync: false,
  canValidate: true,
  capabilities: validationOnlyCapabilities,
  validateKey: async (apiKey: string) => {
    const res = await fetch("https://api.deepinfra.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    return res.status === 200
  },
}
