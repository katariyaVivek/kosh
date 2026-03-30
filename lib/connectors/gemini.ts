import type { Connector } from "./types"

export const geminiConnector: Connector = {
  platform: "Google Gemini",
  canSync: false,
  canValidate: true,
  validateKey: async (apiKey: string) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    )
    return res.status === 200
  },
}
