"use client"

import { LayoutDashboard } from "lucide-react"
import { useKoshShell } from "@/components/kosh-shell"
import { Button } from "@/components/ui/button"

export function EmptyState() {
  const { openSidebarAction } = useKoshShell()

  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <div className="mx-auto flex max-w-sm flex-col items-center rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <LayoutDashboard className="size-10 text-muted-foreground/40" />
        <h1 className="mt-4 text-sm font-medium text-foreground">No API keys yet</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add your first key to get started
        </p>
        <Button onClick={() => openSidebarAction()} className="mt-4 text-sm">
          Add key
        </Button>
      </div>
    </div>
  )
}
