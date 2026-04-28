import type { Connector } from "./types"
import { validationOnlyCapabilities } from "./capabilities"

export const gitlabConnector: Connector = {
  platform: "GitLab Duo",
  canSync: false,
  canValidate: true,
  capabilities: validationOnlyCapabilities,
  validateKey: async (apiKey: string) => {
    const res = await fetch("https://gitlab.com/api/v4/user", {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    return res.status === 200
  },
}
