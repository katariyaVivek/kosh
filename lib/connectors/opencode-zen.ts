import type { Connector } from "./types"
import { validationOnlyCapabilities } from "./capabilities"

export const opencodeZenConnector: Connector = {
  platform: "OpenCode",
  canSync: false,
  canValidate: true,
  capabilities: validationOnlyCapabilities,
  validateKey: async (apiKey: string) => {
    const res = await fetch("https://opencode.ai/zen/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    return res.status === 200
  },
}
