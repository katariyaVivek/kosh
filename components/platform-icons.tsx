import { cn } from "@/lib/utils"

const IconWrapper = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={cn("size-4", className)}
    xmlns="http://www.w3.org/2000/svg"
  >
    {children}
  </svg>
)

export function OpenAIIcon({ className }: { className?: string }) {
  return (
    <IconWrapper className={className}>
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0907 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.4746a4.4755 4.4755 0 0 1-4.4945 4.5976zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0805 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.843-3.3695v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4755 4.4755 0 0 1-6.1408-1.6464zM2.0813 7.6702a4.4708 4.4708 0 0 1 2.36-1.9658v5.5207a.7665.7665 0 0 0 .39.6767l5.8145 3.3553-2.02 1.168a.0757.0757 0 0 1-.071 0l-4.7358-2.7345a4.4802 4.4802 0 0 1-1.7377-5.9847zm16.2038-3.226a4.4802 4.4802 0 0 1-1.7424 5.9894L10.7 6.7293l2.0155-1.1638a.0757.0757 0 0 1 .071 0l4.74 2.7535a4.4755 4.4755 0 0 1 3.3968.2195c.2457.3663.4293.7768.5485 1.21zm1.5763 7.4785a.0757.0757 0 0 1-.038.0615l-5.8192-3.3553-4.7736-2.7582-2.0155-1.1638a.0757.0757 0 0 1 0-.071l2.02-1.1638a.071.071 0 0 1 .0662 0l4.7783 2.7535a4.4802 4.4802 0 0 1 2.28 2.0867 4.5086 4.5086 0 0 1-.4993 3.6062z" />
    </IconWrapper>
  )
}

export function AnthropicIcon({ className }: { className?: string }) {
  return (
    <IconWrapper className={className}>
      <path d="M2.4727 2.6252c-1.28-.256-2.368.448-2.432 1.6-.064 1.152.96 2.048 2.24 2.048h2.304v2.112h-2.304c-1.28 0-2.304-.896-2.304-2.048 0-1.152.896-2.048 2.048-2.048h2.304v-1.28zm19.072 0c1.28-.256 2.368.448 2.432 1.6.064 1.152-.96 2.048-2.24 2.048h-2.304v2.112h2.304c1.28 0 2.304-.896 2.304-2.048 0-1.152-.896-2.048-2.048-2.048h-2.304v-1.28zM12 2.6252c-3.328 0-6.016 2.688-6.016 6.016v10.816c0 1.792 1.408 3.2 3.2 3.2h5.632c1.792 0 3.2-1.408 3.2-3.2V8.6412c0-3.328-2.688-6.016-6.016-6.016zm2.816 9.344h-5.632c-.448 0-.8-.352-.8-.8v-2.496c0-.448.352-.8.8-.8h5.632c.448 0 .8.352.8.8v2.496c0 .448-.352.8-.8.8z" />
    </IconWrapper>
  )
}

export function OpenRouterIcon({ className }: { className?: string }) {
  return (
    <IconWrapper className={className}>
      <path d="M11.98 2.04a.9.9 0 0 0-.9 0L2.2 7.68a.9.9 0 0 0-.45.78v10.98a.9.9 0 0 0 .45.78l8.88 5.64a.9.9 0 0 0 .9 0l8.88-5.64a.9.9 0 0 0 .45-.78V8.46a.9.9 0 0 0-.45-.78L11.98 2.04ZM6.36 9.18a1.08 1.08 0 1 1 1.08-1.08 1.08 1.08 0 0 1-1.08 1.08Zm11.28 0a1.08 1.08 0 1 1 1.08-1.08 1.08 1.08 0 0 1-1.08 1.08ZM12 22.26a1.08 1.08 0 1 1 1.08-1.08 1.08 1.08 0 0 1-1.08 1.08Z" />
    </IconWrapper>
  )
}

export function NvidiaIcon({ className }: { className?: string }) {
  return (
    <IconWrapper className={className}>
      <path d="M9.6 15.1c.4.3 1 .7 1.4.9 1.1.6 2.4.9 3.8.9 1.8 0 3.4-.5 4.7-1.4.6-.4 1.1-.9 1.5-1.5.4-.6.6-1.3.6-2 0-1.2-.5-2.2-1.3-3-.8-.8-1.8-1.3-3-1.5-.4-.1-.8-.1-1.2-.1-.4 0-.8 0-1.2.1-1.2.2-2.2.7-3 1.5-.8.8-1.3 1.8-1.3 3 0 .7.2 1.4.6 2 .3.5.6.9 1 1.2zm-.6-1.5c-.1-.3-.2-.7-.2-1.1 0-.8.3-1.5.8-2.1.5-.6 1.2-.9 1.9-1.1.3-.1.6-.1.9-.1.3 0 .6 0 .9.1.7.2 1.4.5 1.9 1.1.5.6.8 1.3.8 2.1 0 .4-.1.8-.2 1.1-.3.7-.8 1.3-1.4 1.7-.6.4-1.3.6-2.1.6-.8 0-1.5-.2-2.1-.6-.6-.4-1.1-1-1.4-1.7z" />
    </IconWrapper>
  )
}

export function GeminiIcon({ className }: { className?: string }) {
  return (
    <IconWrapper className={className}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.68.7 5.05 1.85L12 13.7 6.95 7.85C8.32 6.7 10.07 6 12 6zm-7.15 3.15L12 13.7l7.15 4.55C18.3 16.3 15.42 15.2 12 15.2S5.7 16.3 4.85 18.15zm1.4 5.15c1.12-1.5 3.53-2.5 5.75-2.5s4.63 1 5.75 2.5c-1.12 1.5-3.53 2.5-5.75 2.5s-4.63-1-5.75-2.5z" />
    </IconWrapper>
  )
}

export function GroqIcon({ className }: { className?: string }) {
  return (
    <IconWrapper className={className}>
      <path d="M16.79 2.68L12 6.2 7.21 2.68 3 5.8l4.79 3.52L3 12.84l4.21 3.12L12 12.44l4.79 3.52L21 12.84l-4.79-3.52L21 5.8l-4.21-3.12zM12 19.32l-4.79 3.52L3 19.32l4.21-3.12L12 12.68l4.79 3.52L21 19.32l-4.21 3.12L12 19.32z" />
    </IconWrapper>
  )
}

export function StripeIcon({ className }: { className?: string }) {
  return (
    <IconWrapper className={className}>
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
    </IconWrapper>
  )
}

export function TwilioIcon({ className }: { className?: string }) {
  return (
    <IconWrapper className={className}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2a7.2 7.2 0 0 1-6-3.1c.03-1.99 4-3.1 6-3.1 1.99 0 5.97 1.11 6 3.1a7.2 7.2 0 0 1-6 3.1z" />
    </IconWrapper>
  )
}

export function xAIIcon({ className }: { className?: string }) {
  return (
    <IconWrapper className={className}>
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </IconWrapper>
  )
}

export function ReplicateIcon({ className }: { className?: string }) {
  return (
    <IconWrapper className={className}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 4c2.76 0 5 2.24 5 5H7c0-2.76 2.24-5 5-5z" />
    </IconWrapper>
  )
}

export function TogetherIcon({ className }: { className?: string }) {
  return (
    <IconWrapper className={className}>
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 12l10 5 10-5M2 17l10 5 10-5" />
    </IconWrapper>
  )
}

export function MistralIcon({ className }: { className?: string }) {
  return (
    <IconWrapper className={className}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </IconWrapper>
  )
}

export function OtherIcon({ className }: { className?: string }) {
  return (
    <IconWrapper className={className}>
      <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
    </IconWrapper>
  )
}

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

const ICON_MAP: Record<PlatformName, React.ComponentType<{ className?: string }>> = {
  OpenAI: OpenAIIcon,
  Anthropic: AnthropicIcon,
  OpenRouter: OpenRouterIcon,
  "NVIDIA NIM": NvidiaIcon,
  "Google Gemini": GeminiIcon,
  Groq: GroqIcon,
  Stripe: StripeIcon,
  Twilio: TwilioIcon,
  xAI: xAIIcon,
  Replicate: ReplicateIcon,
  "Together AI": TogetherIcon,
  Mistral: MistralIcon,
  Other: OtherIcon,
}

export function getPlatformIcon(platform: string) {
  const name = (ICON_MAP as Record<string, React.ComponentType<{ className?: string }>>)[platform]
    ? platform
    : "Other"
  return ICON_MAP[name as PlatformName]
}
