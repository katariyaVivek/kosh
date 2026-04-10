import { anthropicConnector } from "./anthropic"
import { geminiConnector } from "./gemini"
import { groqConnector } from "./groq"
import { manualConnector } from "./manual"
import { mistralConnector } from "./mistral"
import { nvidiaConnector } from "./nvidia"
import { openaiConnector } from "./openai"
import { openrouterConnector } from "./openrouter"
import { replicateConnector } from "./replicate"
import { stripeConnector } from "./stripe"
import { togetherConnector } from "./together"
import { xaiConnector } from "./xai"
import type { Connector } from "./types"

const googleConnector: Connector = {
  platform: "Google",
  canSync: false,
  canValidate: false,
}

const twilioConnector: Connector = {
  platform: "Twilio",
  canSync: false,
  canValidate: false,
}

const connectors: Connector[] = [
  openrouterConnector,
  openaiConnector,
  stripeConnector,
  nvidiaConnector,
  anthropicConnector,
  googleConnector,
  twilioConnector,
  groqConnector,
  geminiConnector,
  xaiConnector,
  replicateConnector,
  togetherConnector,
  mistralConnector,
  manualConnector,
]

export function getConnector(platform: string): Connector {
  return connectors.find((connector) => connector.platform === platform) ?? manualConnector
}

export { connectors }
