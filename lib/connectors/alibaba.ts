import type { Connector } from "./types"
import { validationOnlyCapabilities } from "./capabilities"

export const alibabaConnector: Connector = {
  platform: "Alibaba",
  canSync: false,
  canValidate: true,
  capabilities: validationOnlyCapabilities,
  validateKey: async (apiKey: string) => {
    const res = await fetch(
      "https://dashscope.aliyuncs.com/api/v1/services/qwen/models",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    )
    return res.status === 200
  },
}
