import type { Connector } from "./types"
import { manualCapabilities } from "./capabilities"

export const manualConnector: Connector = {
  platform: "Other",
  canSync: false,
  canValidate: false,
  capabilities: manualCapabilities,
}
