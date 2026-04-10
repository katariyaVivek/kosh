export const PLATFORM_INITIALS: Record<string, string> = {
  OpenAI: "OA",
  OpenRouter: "OR",
  "NVIDIA NIM": "NV",
  Anthropic: "AN",
  "Google Gemini": "GG",
  Groq: "GQ",
  Stripe: "ST",
  Twilio: "TW",
  xAI: "xA",
  Replicate: "RP",
  "Together AI": "TA",
  Mistral: "MS",
  Other: "?",
}

export const PLATFORM_COLORS: Record<string, string> = {
  OpenAI: "#10a37f",
  OpenRouter: "#6366f1",
  Anthropic: "#d97706",
  "NVIDIA NIM": "#76b900",
  "Google Gemini": "#4285f4",
  Groq: "#f55036",
  Stripe: "#635bff",
  Twilio: "#f22f46",
  xAI: "#000000",
  Replicate: "#ff6a00",
  "Together AI": "#ff007a",
  Mistral: "#ff6600",
  Other: "#6b7280",
}

function toSixDigitHex(hex: string) {
  const normalized = hex.replace("#", "")
  if (normalized.length === 3) {
    return normalized
      .split("")
      .map((char) => char + char)
      .join("")
  }
  return normalized
}

export function getPlatformInitial(platform: string): string {
  return PLATFORM_INITIALS[platform] ?? platform.slice(0, 2).toUpperCase()
}

export function getPlatformColor(platform: string): string {
  return PLATFORM_COLORS[platform] ?? "#6b7280"
}

export function getPlatformColorWithAlpha(
  platform: string,
  alpha = 0.15
): string {
  const color = getPlatformColor(platform)
  const hex = toSixDigitHex(color)
  const alphaHex = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")
  return `#${hex}${alphaHex}`
}
