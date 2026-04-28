import { alibabaConnector } from "./alibaba"
import { anthropicConnector } from "./anthropic"
import { cerebrasConnector } from "./cerebras"
import { cohereConnector } from "./cohere"
import { deepinfraConnector } from "./deepinfra"
import { deepseekConnector } from "./deepseek"
import { geminiConnector } from "./gemini"
import { githubCopilotConnector } from "./github-copilot"
import { gitlabConnector } from "./gitlab"
import { groqConnector } from "./groq"
import { manualConnector } from "./manual"
import { mistralConnector } from "./mistral"
import { nvidiaConnector } from "./nvidia"
import { openaiConnector } from "./openai"
import { opencodeZenConnector } from "./opencode-zen"
import { openrouterConnector } from "./openrouter"
import { perplexityConnector } from "./perplexity"
import { replicateConnector } from "./replicate"
import { stripeConnector } from "./stripe"
import { togetherConnector } from "./together"
import { veniceConnector } from "./venice"
import { xaiConnector } from "./xai"
import type { Connector } from "./types"
import { manualCapabilities } from "./capabilities"

const googleConnector: Connector = {
  platform: "Google",
  canSync: false,
  canValidate: false,
  capabilities: manualCapabilities,
}

const twilioConnector: Connector = {
  platform: "Twilio",
  canSync: false,
  canValidate: false,
  capabilities: manualCapabilities,
}

const connectors: Connector[] = [
  openrouterConnector,
  opencodeZenConnector,
  openaiConnector,
  stripeConnector,
  nvidiaConnector,
  anthropicConnector,
  deepseekConnector,
  perplexityConnector,
  cohereConnector,
  cerebrasConnector,
  deepinfraConnector,
  alibabaConnector,
  veniceConnector,
  githubCopilotConnector,
  gitlabConnector,
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
