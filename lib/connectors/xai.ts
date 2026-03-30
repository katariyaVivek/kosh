import type { Connector } from "./types"

export const xaiConnector: Connector = {
  platform: "xAI",
  canSync: false,
  canValidate: true,
  validateKey: async (apiKey: string) => {
    const res = await fetch("https://api.x.ai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    return res.status === 200
  },
}
