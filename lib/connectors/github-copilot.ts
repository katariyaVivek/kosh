import type { Connector } from "./types"
import { validationOnlyCapabilities } from "./capabilities"

export const githubCopilotConnector: Connector = {
  platform: "GitHub Copilot",
  canSync: false,
  canValidate: true,
  capabilities: validationOnlyCapabilities,
  validateKey: async (apiKey: string) => {
    const res = await fetch("https://api.github.com/copilot/usage", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })
    return res.status === 200
  },
}
