"use client"

import { useDeferredValue, useRef, useState } from "react"
import { differenceInDays, formatDistanceToNow } from "date-fns"
import {
  Copy,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  KeyRound,
  Layers,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
  Loader2,
  Check,
  ChevronDown,
} from "lucide-react"
import { useRouter } from "next/navigation"

import { AddKeyDialog } from "@/components/add-key-dialog"
import { useKoshShell } from "@/components/kosh-shell"
import { useToast } from "@/components/toast"
import { useKeyboardShortcuts } from "@/components/keyboard-shortcuts"
import { EmptyStateIllustration } from "@/components/empty-state-illustration"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { formatEnvironment, KoshKey } from "@/lib/kosh"
import { getRotationStatus, needsRotationAttention } from "@/lib/rotation"
import {
  getPlatformColor,
  getPlatformColorWithAlpha,
} from "@/lib/platform-config"
import { getPlatformIcon } from "@/components/platform-icons"
import { cn } from "@/lib/utils"

const MASKED_KEY = "sk-********************"

export function VaultView({ keys }: { keys: KoshKey[] }) {
  const router = useRouter()
  const { openSidebarAction } = useKoshShell()
  const { success, error: toastError, info } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [activePlatform, setActivePlatform] = useState("All")
  const [revealed, setRevealed] = useState<Record<string, string | false>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<KoshKey | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [rotationLoadingId, setRotationLoadingId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [visibleCount, setVisibleCount] = useState(20)

  useKeyboardShortcuts([
    { key: "/", handler: () => searchInputRef.current?.focus(), preventDefault: true },
  ])

  const toggleReveal = async (id: string) => {
    if (revealed[id]) {
      setRevealed((prev) => ({ ...prev, [id]: false }))
      return
    }

    const res = await fetch("/api/keys/reveal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    const { value } = await res.json()
    setRevealed((prev) => ({ ...prev, [id]: value }))
    setTimeout(() => {
      setRevealed((prev) => ({ ...prev, [id]: false }))
    }, 30000)
  }

  const copyKey = async (id: string) => {
    const res = await fetch("/api/keys/reveal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) {
      toastError("Copy failed", "Unable to reveal and copy the key")
      return
    }
    const { value } = await res.json()
    await navigator.clipboard.writeText(value)
    setCopiedId(id)
    success("Key copied to clipboard")
    setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current))
    }, 1400)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    if (selectedIds.size === filteredKeys.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredKeys.map((k) => k.id)))
    }
  }

  const clearSelection = () => setSelectedIds(new Set())

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return
    setBulkActionLoading(true)
    let deleted = 0
    let failed = 0
    for (const id of selectedIds) {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" })
      if (res.ok) deleted++
      else failed++
    }
    setBulkActionLoading(false)
    if (deleted > 0) {
      success("Bulk delete complete", `${deleted} key(s) deleted`)
    }
    if (failed > 0) {
      toastError("Bulk delete partial", `${failed} key(s) failed to delete`)
    }
    setSelectedIds(new Set())
    router.refresh()
  }

  const bulkValidate = async () => {
    if (selectedIds.size === 0) return
    setBulkActionLoading(true)
    let valid = 0
    let invalid = 0
    for (const id of selectedIds) {
      const res = await fetch("/api/keys/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        const { value } = await res.json()
        const key = filteredKeys.find((k) => k.id === id)
        if (key) {
          const connector = await fetch("/api/connectors").then((r) => r.json())
          const platform = key.platform
          const platformConnector = connector.find(
            (c: any) => c.platform === platform
          )
          if (platformConnector?.canValidate) {
            const syncRes = await fetch(`/api/sync/${id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "validate" }),
            })
            const data = await syncRes.json()
            if (data.valid) valid++
            else invalid++
          }
        }
      }
    }
    setBulkActionLoading(false)
    info("Validation complete", `${valid} valid, ${invalid} invalid`)
  }

  const handleDelete = async () => {
    if (!deleteId) return

    setDeleteLoading(true)

    const res = await fetch(`/api/keys/${deleteId}`, {
      method: "DELETE",
    })

    setDeleteLoading(false)

    if (!res.ok) {
      toastError("Delete failed", "Unable to delete the key")
      return
    }

    success("Key deleted", "The key has been permanently removed")
    setDeleteId(null)
    setRevealed((prev) => {
      const next = { ...prev }
      delete next[deleteId]
      return next
    })
    setCopiedId((current) => (current === deleteId ? null : current))
    router.refresh()
  }

  const handleMarkRotated = async (id: string) => {
    setRotationLoadingId(id)

    const res = await fetch(`/api/keys/${id}/rotation`, {
      method: "POST",
    })

    setRotationLoadingId((current) => (current === id ? null : current))

    if (!res.ok) {
      toastError("Rotation update failed")
      return
    }

    success("Marked as rotated", "Key rotation status updated")
    router.refresh()
  }

  const stats = [
    { label: "Total keys", value: keys.length, icon: KeyRound },
    {
      label: "Platforms",
      value: new Set(keys.map((key) => key.platform)).size,
      icon: Layers,
    },
    {
      label: "Projects",
      value: new Set(keys.map((key) => key.projectTag).filter(Boolean)).size,
      icon: FolderOpen,
    },
  ]

  const platforms = Array.from(new Set(keys.map((key) => key.platform)))
  const effectivePlatform = platforms.includes(activePlatform) ? activePlatform : "All"
  const normalizedQuery = deferredSearchQuery.trim().toLowerCase()
  const filteredKeys = keys.filter((key) => {
    const matchesPlatform =
      effectivePlatform === "All" || key.platform === effectivePlatform
    const matchesSearch =
      normalizedQuery.length === 0 ||
      [key.name, key.platform, key.projectTag ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)

    return matchesPlatform && matchesSearch
  })

  const now = new Date()

  if (keys.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-border/70 bg-card/80 px-8 py-12 text-center shadow-sm backdrop-blur">
          <EmptyStateIllustration variant="vault" className="mb-6" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Your treasury is empty
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Add your first API key to get started
          </p>
          <Button
            onClick={openSidebarAction}
            className="mt-6 gap-2 rounded-xl px-5"
          >
            Add key
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-8 space-y-2">
        <Badge
          variant="outline"
          className="h-6 rounded-full border-border/80 bg-background/70 px-2.5 text-[11px] font-medium text-muted-foreground"
        >
          Vault
        </Badge>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Vault
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All your API keys, encrypted.
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {stats.map(({ icon: Icon, label, value }) => (
          <Card
            key={label}
            size="sm"
            className="bg-card/80 shadow-sm ring-border/80 backdrop-blur"
          >
            <CardContent className="flex items-center gap-3 py-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Icon className="size-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {label}
                </p>
                <p className="text-2xl font-medium tracking-tight text-foreground/85">
                  {value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 h-px bg-border/70" />

      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3">
          <span className="flex-1 text-sm font-medium text-indigo-400">
            {selectedIds.size} key{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={bulkValidate}
            disabled={bulkActionLoading}
            className="gap-1.5 text-xs"
          >
            {bulkActionLoading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <ShieldCheck className="size-3" />
            )}
            Validate
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={bulkDelete}
            disabled={bulkActionLoading}
            className="gap-1.5 text-xs"
          >
            {bulkActionLoading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Trash2 className="size-3" />
            )}
            Delete
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={clearSelection}
            disabled={bulkActionLoading}
            className="text-muted-foreground"
          >
            <X className="size-3" />
          </Button>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search keys..."
            className="h-10 rounded-xl border-border/70 bg-card/70 pl-9 shadow-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button
            size="sm"
            variant={selectedIds.size > 0 ? "secondary" : "outline"}
            onClick={selectAll}
            className="rounded-full px-3"
          >
            <Check className="mr-1.5 size-3" />
            {selectedIds.size === filteredKeys.length ? "Deselect all" : "Select all"}
          </Button>
          {["All", ...platforms].map((platform) => {
            const isActive = platform === effectivePlatform

            return (
              <Button
                key={platform}
                type="button"
                variant={isActive ? "secondary" : "outline"}
                size="sm"
                onClick={() =>
                  setActivePlatform((current) =>
                    current === platform ? "All" : platform
                  )
                }
                className={cn(
                  "rounded-full px-3",
                  isActive
                    ? "bg-secondary text-secondary-foreground shadow-sm"
                    : "border-border/70 bg-card/70 text-muted-foreground hover:text-foreground"
                )}
              >
                {platform}
              </Button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {filteredKeys.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-12 text-center text-sm text-muted-foreground">
            <EmptyStateIllustration variant="no-results" className="mb-4" />
            <p className="font-medium">No keys match your search</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Try adjusting your search or platform filters
            </p>
          </div>
        ) : (
          filteredKeys.slice(0, visibleCount).map((key) => {
            const accentColor = getPlatformColor(key.platform)
            const softColor = getPlatformColorWithAlpha(key.platform, 0.08)
            const expiresAt = key.expiresAt ? new Date(key.expiresAt) : null
            const daysUntilExpiry =
              expiresAt !== null ? differenceInDays(expiresAt, now) : null
            const expiryBadge =
              expiresAt !== null && daysUntilExpiry !== null
                ? (() => {
                    if (daysUntilExpiry < 0) {
                      return (
                        <Badge
                          variant="outline"
                          className="h-5 rounded-full border border-destructive/70 bg-destructive/10 px-2.5 text-[11px] font-medium text-destructive"
                        >
                          Expired
                        </Badge>
                      )
                    }

                    if (daysUntilExpiry <= 7) {
                      return (
                        <Badge
                          variant="outline"
                          className="h-5 rounded-full border border-destructive/70 bg-destructive/10 px-2.5 text-[11px] font-medium text-destructive"
                        >
                          Expiring soon
                        </Badge>
                      )
                    }

                    if (daysUntilExpiry <= 30) {
                      return (
                        <Badge
                          variant="outline"
                          className="h-5 rounded-full border border-amber-400/70 bg-amber-400/10 px-2.5 text-[11px] font-medium text-amber-400"
                        >
                          Expires in {daysUntilExpiry} days
                        </Badge>
                      )
                    }

                    return null
                  })()
                : null
            const rotation = getRotationStatus(key, now)
            const isRotationDue = needsRotationAttention(rotation.state)
            const rotationBadge =
              rotation.state === "overdue"
                ? (
                    <Badge
                      variant="outline"
                      className="h-5 rounded-full border border-destructive/70 bg-destructive/10 px-2.5 text-[11px] font-medium text-destructive"
                    >
                      Overdue by {Math.abs(rotation.daysUntilDue ?? 0)} days
                    </Badge>
                  )
                : rotation.state === "due_today"
                  ? (
                      <Badge
                        variant="outline"
                        className="h-5 rounded-full border border-destructive/70 bg-destructive/10 px-2.5 text-[11px] font-medium text-destructive"
                      >
                        Rotate today
                      </Badge>
                    )
                  : rotation.state === "due_soon"
                    ? (
                        <Badge
                          variant="outline"
                          className="h-5 rounded-full border border-amber-400/70 bg-amber-400/10 px-2.5 text-[11px] font-medium text-amber-400"
                        >
                          Rotate in {rotation.daysUntilDue} days
                        </Badge>
                      )
                    : null

            return (
              <Card
                key={key.id}
                className="group/card border-l-4 bg-card/85 shadow-sm ring-border/80 transition-[background-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-1 hover:bg-accent/40 hover:shadow-lg hover:ring-1 hover:ring-primary/10 active:translate-y-0 active:scale-[0.99]"
                style={{ borderLeftColor: accentColor }}
              >
                <CardContent className={`flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between transition-transform duration-300 ${revealed[key.id] ? "scale-[1.02]" : ""}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleSelect(key.id)}
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
                        selectedIds.has(key.id)
                          ? "border-indigo-500 bg-indigo-500 text-white"
                          : "border-border/70 bg-muted/30 text-transparent hover:border-border"
                      )}
                      aria-label={selectedIds.has(key.id) ? "Deselect key" : "Select key"}
                    >
                      <Check className="size-3" />
                    </button>
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-full border"
                      style={{
                        color: accentColor,
                        backgroundColor: softColor,
                        borderColor: softColor,
                      }}
                    >
                      {(() => {
                        const Icon = getPlatformIcon(key.platform)
                        return <Icon className="size-5" />
                      })()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2">
                           <div className="flex items-center gap-1.5">
                             <p className="truncate text-base font-semibold tracking-tight">
                               {key.name}
                             </p>
                             {key.notes ? (
                               <span title={key.notes}>
                                 <FileText className="h-3 w-3 text-muted-foreground" />
                               </span>
                             ) : null}
                             </div>
                            {expiryBadge}
                            {rotationBadge}
                          </div>
                        <Badge
                          variant="outline"
                          className="h-6 rounded-full border-border/80 bg-muted/60 px-2.5 text-[11px] font-medium text-muted-foreground"
                        >
                          {formatEnvironment(key.environment)}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{key.platform}</span>
                        {key.projectTag ? (
                          <>
                            <span className="text-muted-foreground/50">/</span>
                            <span>{key.projectTag}</span>
                          </>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground/70">
                        Added {formatDistanceToNow(new Date(key.createdAt))} ago
                      </p>
                    </div>
                  </div>

                  <div className="md:self-stretch">
                    <div className="flex w-full items-center gap-1 rounded-xl border border-border/70 bg-muted/35 p-1 shadow-inner md:min-w-[360px]">
                      <code className="min-w-0 flex-1 overflow-x-auto px-2 py-1.5 text-xs text-muted-foreground">
                        {revealed[key.id] ? String(revealed[key.id]) : MASKED_KEY}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => toggleReveal(key.id)}
                        className="rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label={revealed[key.id] ? "Hide key" : "Reveal key"}
                        title={revealed[key.id] ? "Hide key" : "Reveal key"}
                      >
                        {revealed[key.id] ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </Button>

                      <div className="relative">
                        <span
                          className={cn(
                            "pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md border border-border/80 bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-sm transition-all duration-200",
                            copiedId === key.id
                              ? "translate-y-0 opacity-100"
                              : "translate-y-1 opacity-0"
                          )}
                        >
                          copied!
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => copyKey(key.id)}
                          className="rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Copy key"
                          title="Copy key"
                        >
                          <Copy className="size-4" />
                        </Button>
                      </div>

                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEditingKey(key)}
                          className="rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Edit key"
                          title="Edit key"
                        >
                          <Pencil className="size-4" />
                        </Button>

                        {key.rotationIntervalDays ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleMarkRotated(key.id)}
                            disabled={rotationLoadingId === key.id}
                            className={cn(
                              "rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground",
                              isRotationDue && "text-amber-500 hover:text-amber-500"
                            )}
                            aria-label="Mark rotated"
                            title="Mark rotated now"
                          >
                            <RefreshCw
                              className={cn(
                                "size-4",
                                rotationLoadingId === key.id && "animate-spin"
                              )}
                            />
                          </Button>
                        ) : null}

                        <Button
                          variant="ghost"
                          size="icon-sm"
                        onClick={() => setDeleteId(key.id)}
                        className="rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete key"
                        title="Delete key"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {visibleCount < filteredKeys.length && (
        <div className="flex justify-center py-6">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((c) => c + 20)}
            className="gap-2"
          >
            <ChevronDown className="size-4" />
            Show more ({filteredKeys.length - visibleCount} remaining)
          </Button>
        </div>
      )}

      {editingKey ? (
        <AddKeyDialog
          key={`edit-${editingKey.id}`}
          open={editingKey !== null}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setEditingKey(null)
            }
          }}
          mode="edit"
          initialValues={editingKey}
        />
      ) : null}
      <Dialog
        open={deleteId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deleteLoading) {
            setDeleteId(null)
          }
        }}
      >
        <DialogContent showCloseButton={!deleteLoading}>
          <DialogHeader>
            <DialogTitle>Delete this key?</DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
