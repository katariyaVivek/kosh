export function HeroBackground() {
  return (
    <div className="pointer-events-none absolute -inset-x-8 -top-8 h-64 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-primary/[0.01] to-transparent dark:from-primary/[0.06] dark:via-primary/[0.02]" />
      <div className="absolute top-0 left-1/4 h-40 w-80 rounded-full bg-primary/[0.06] blur-3xl dark:bg-primary/[0.08]" />
      <div className="absolute top-4 right-1/3 h-32 w-64 rounded-full bg-chart-2/[0.05] blur-3xl dark:bg-chart-2/[0.07]" />
      <div className="absolute top-8 left-1/2 h-28 w-56 rounded-full bg-chart-3/[0.04] blur-3xl dark:bg-chart-3/[0.06]" />
    </div>
  )
}
