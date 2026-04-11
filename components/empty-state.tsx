"use client"

import { useKoshShell } from "@/components/kosh-shell"
import { Button } from "@/components/ui/button"
import { EmptyStateIllustration } from "@/components/empty-state-illustration"

export function EmptyState() {
  const { openSidebarAction } = useKoshShell()

  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <div className="mx-auto flex max-w-sm flex-col items-center rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <EmptyStateIllustration variant="treasury" className="mb-4" />
        <h1 className="text-lg font-semibold text-foreground">No API keys yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add your first key to start tracking usage and costs.
        </p>
        <Button onClick={() => openSidebarAction()} className="mt-4">
          Add key
        </Button>
      </div>
    </div>
  )
}
