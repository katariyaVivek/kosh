import type { Connector } from "./types"
import { validationOnlyCapabilities } from "./capabilities"

export const nvidiaConnector: Connector = {
  platform: "NVIDIA NIM",
  canSync: false,
  canValidate: true,
  capabilities: {
    ...validationOnlyCapabilities,
    privacyNote: "NVIDIA NIM does not expose usage data through this connector; log usage manually.",
  },
  async validateKey(apiKey) {
    const response = await fetch("https://integrate.api.nvidia.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    })

    return response.ok
  },
}
