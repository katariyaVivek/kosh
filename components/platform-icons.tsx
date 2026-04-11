import {
  Sparkles,
  Bot,
  Route,
  Cpu,
  Gem,
  Zap,
  CreditCard,
  MessageSquare,
  Atom,
  Layers,
  Users,
  Wind,
  Link,
  type LucideIcon,
} from "lucide-react"

type PlatformName =
  | "OpenAI"
  | "Anthropic"
  | "OpenRouter"
  | "NVIDIA NIM"
  | "Google Gemini"
  | "Groq"
  | "Stripe"
  | "Twilio"
  | "xAI"
  | "Replicate"
  | "Together AI"
  | "Mistral"
  | "Other"

const ICON_MAP: Record<PlatformName, LucideIcon> = {
  OpenAI: Sparkles,        // sparkles — clean, matches OpenAI branding
  Anthropic: Bot,          // bot — AI assistant feel
  OpenRouter: Route,       // route — gateway/router
  "NVIDIA NIM": Cpu,       // chip — GPU/AI hardware
  "Google Gemini": Gem,    // gem — gemstone, matches Gemini name
  Groq: Zap,               // zap — speed, Groq's key selling point
  Stripe: CreditCard,      // credit card — payments
  Twilio: MessageSquare,   // message — communications/SMS
  xAI: Atom,               // atom — science/truth-seeking
  Replicate: Layers,       // layers — model replication
  "Together AI": Users,    // users — collaboration
  Mistral: Wind,           // wind — named after the mistral wind
  Other: Link,             // generic link
}

export function getPlatformIcon(platform: string): LucideIcon {
  return ICON_MAP[platform as PlatformName] ?? ICON_MAP.Other
}
