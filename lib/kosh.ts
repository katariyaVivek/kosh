export type KoshKey = {
  id: string
  name: string
  platform: string
  projectTag: string | null
  environment: string
  createdAt: string | Date
}

export type KoshUsageLog = {
  id: string
  apiKeyId: string
  calls: number
  cost: number
  tokens: number | null
  date: string | Date
}

export type KoshAlert = {
  id: string
  apiKeyId: string
  type: string
  threshold: number
  triggered: boolean
  createdAt: string | Date
}

export type KoshAlertWithKey = KoshAlert & {
  apiKey: KoshKey
}

export const PLATFORM_THEMES: Record<
  string,
  { accent: string; soft: string; initial: string }
> = {
  OpenAI: {
    accent: "var(--platform-openai)",
    soft: "var(--platform-openai-soft)",
    initial: "O",
  },
  Anthropic: {
    accent: "var(--platform-anthropic)",
    soft: "var(--platform-anthropic-soft)",
    initial: "A",
  },
  OpenRouter: {
    accent: "var(--platform-openrouter)",
    soft: "var(--platform-openrouter-soft)",
    initial: "R",
  },
  "NVIDIA NIM": {
    accent: "var(--platform-nim)",
    soft: "var(--platform-nim-soft)",
    initial: "N",
  },
  Google: {
    accent: "var(--platform-google)",
    soft: "var(--platform-google-soft)",
    initial: "G",
  },
  Stripe: {
    accent: "var(--platform-stripe)",
    soft: "var(--platform-stripe-soft)",
    initial: "S",
  },
  Twilio: {
    accent: "var(--platform-twilio)",
    soft: "var(--platform-twilio-soft)",
    initial: "T",
  },
  Other: {
    accent: "var(--platform-other)",
    soft: "var(--platform-other-soft)",
    initial: "K",
  },
}

export function formatEnvironment(environment: string) {
  return environment.charAt(0).toUpperCase() + environment.slice(1)
}
