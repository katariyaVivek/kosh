import { cn } from "@/lib/utils"

type IllustrationProps = {
  variant: "treasury" | "vault" | "no-results" | "no-usage"
  className?: string
}

export function EmptyStateIllustration({ variant, className }: IllustrationProps) {
  if (variant === "treasury" || variant === "vault") {
    return (
      <svg
        viewBox="0 0 200 160"
        fill="none"
        className={cn("w-full max-w-[200px]", className)}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Vault body */}
        <rect
          x="40"
          y="50"
          width="120"
          height="90"
          rx="8"
          className="fill-muted/60 stroke-border"
          strokeWidth="2"
        />
        {/* Vault door */}
        <circle cx="100" cy="95" r="28" className="fill-muted stroke-border" strokeWidth="2" />
        {/* Vault door inner */}
        <circle cx="100" cy="95" r="18" className="fill-muted-foreground/5" />
        {/* Handle */}
        <line x1="88" y1="95" x2="112" y2="95" className="stroke-muted-foreground/30" strokeWidth="2" strokeLinecap="round" />
        <line x1="100" y1="83" x2="100" y2="107" className="stroke-muted-foreground/30" strokeWidth="2" strokeLinecap="round" />
        {/* Key icon floating */}
        <g className="animate-bounce" style={{ animationDuration: "3s" }}>
          <circle cx="145" cy="35" r="8" className="stroke-muted-foreground/20" strokeWidth="2" fill="none" />
          <path d="M151 41 L160 50" className="stroke-muted-foreground/20" strokeWidth="2" strokeLinecap="round" />
          <path d="M156 48 L158 46 M158 50 L160 48" className="stroke-muted-foreground/20" strokeWidth="2" strokeLinecap="round" />
        </g>
        {/* Small decorative dots */}
        <circle cx="55" cy="30" r="3" className="fill-muted-foreground/10" />
        <circle cx="150" cy="25" r="2" className="fill-muted-foreground/10" />
        <circle cx="70" cy="20" r="2.5" className="fill-muted-foreground/10" />
      </svg>
    )
  }

  if (variant === "no-results") {
    return (
      <svg
        viewBox="0 0 200 140"
        fill="none"
        className={cn("w-full max-w-[200px]", className)}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Magnifying glass */}
        <circle cx="85" cy="70" r="30" className="stroke-muted-foreground/20" strokeWidth="2" fill="none" />
        <line x1="106" y1="91" x2="125" y2="110" className="stroke-muted-foreground/20" strokeWidth="3" strokeLinecap="round" />
        {/* Question mark */}
        <text x="85" y="78" textAnchor="middle" className="fill-muted-foreground/30" fontSize="24" fontWeight="500">
          ?
        </text>
        {/* Decorative dots */}
        <circle cx="155" cy="40" r="4" className="fill-muted-foreground/10" />
        <circle cx="165" cy="55" r="2.5" className="fill-muted-foreground/10" />
        <circle cx="40" cy="45" r="3" className="fill-muted-foreground/10" />
      </svg>
    )
  }

  // no-usage
  return (
    <svg
      viewBox="0 0 200 140"
      fill="none"
      className={cn("w-full max-w-[200px]", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Flat chart line */}
      <line x1="20" y1="110" x2="180" y2="110" className="stroke-muted-foreground/15" strokeWidth="2" />
      {/* Small bars */}
      <rect x="35" y="108" width="12" height="4" rx="2" className="fill-muted-foreground/10" />
      <rect x="55" y="109" width="12" height="3" rx="1.5" className="fill-muted-foreground/10" />
      <rect x="75" y="108" width="12" height="4" rx="2" className="fill-muted-foreground/10" />
      <rect x="95" y="109" width="12" height="3" rx="1.5" className="fill-muted-foreground/10" />
      <rect x="115" y="108" width="12" height="4" rx="2" className="fill-muted-foreground/10" />
      <rect x="135" y="109" width="12" height="3" rx="1.5" className="fill-muted-foreground/10" />
      {/* Zzz floating */}
      <text x="150" y="55" className="fill-muted-foreground/20" fontSize="14" fontWeight="500">
        z
      </text>
      <text x="160" y="42" className="fill-muted-foreground/15" fontSize="18" fontWeight="500">
        z
      </text>
      <text x="172" y="26" className="fill-muted-foreground/10" fontSize="22" fontWeight="500">
        z
      </text>
    </svg>
  )
}
