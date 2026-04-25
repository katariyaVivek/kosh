import type { Connector } from "./types"
import { validationOnlyCapabilities } from "./capabilities"

export const groqConnector: Connector = {
  platform: "Groq",
  canSync: false,
  canValidate: true,
  capabilities: validationOnlyCapabilities,
  validateKey: async (apiKey: string) => {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    return res.status === 200
  },
}
