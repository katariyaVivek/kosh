"use client"

import { useKoshShell } from "@/components/kosh-shell"
import { Button } from "@/components/ui/button"
import { EmptyStateIllustration } from "@/components/empty-state-illustration"

export function EmptyState() {
  const { openSidebarAction } = useKoshShell()

  return (
    <div className="flex flex-1 items-center justify-center py-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center overflow-hidden rounded-lg border border-border/80 bg-card/82 text-center shadow-[0_18px_60px_hsl(222_34%_6%_/_0.08)]">
        <div className="h-px w-full bg-primary/70" />
        <div className="flex w-full flex-col items-center px-6 py-10">
          <EmptyStateIllustration variant="treasury" className="mb-4" />
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            No API keys yet
          </h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Add your first credential to unlock usage telemetry, rotation policy, and alert monitoring.
          </p>
          <Button onClick={() => openSidebarAction()} className="mt-5 rounded-lg px-4">
            Add key
          </Button>
        </div>
      </div>
    </div>
  )
}
