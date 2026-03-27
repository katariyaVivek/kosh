import type { Connector } from "./types"

export const nvidiaConnector: Connector = {
  platform: "NVIDIA NIM",
  canSync: false,
  canValidate: true,
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
