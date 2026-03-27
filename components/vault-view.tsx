"use client"

import { useDeferredValue, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import {
  Copy,
  Eye,
  EyeOff,
  FolderOpen,
  KeyRound,
  Layers,
  Pencil,
  Search,
  Trash2,
  Vault,
} from "lucide-react"
import { useRouter } from "next/navigation"

import { AddKeyDialog } from "@/components/add-key-dialog"
import { useKoshShell } from "@/components/kosh-shell"
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
import {
  formatEnvironment,
  KoshKey,
  PLATFORM_THEMES,
} from "@/lib/kosh"
import { cn } from "@/lib/utils"

const MASKED_KEY = "sk-********************"

export function VaultView({ keys }: { keys: KoshKey[] }) {
  const router = useRouter()
  const { openSidebarAction } = useKoshShell()
  const [searchQuery, setSearchQuery] = useState("")
  const [activePlatform, setActivePlatform] = useState("All")
  const [revealed, setRevealed] = useState<Record<string, string | false>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<KoshKey | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const deferredSearchQuery = useDeferredValue(searchQuery)

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
    const { value } = await res.json()
    await navigator.clipboard.writeText(value)
    setCopiedId(id)
    setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current))
    }, 1400)
  }

  const handleDelete = async () => {
    if (!deleteId) return

    setDeleteLoading(true)

    const res = await fetch(`/api/keys/${deleteId}`, {
      method: "DELETE",
    })

    setDeleteLoading(false)

    if (!res.ok) {
      return
    }

    setDeleteId(null)
    setRevealed((prev) => {
      const next = { ...prev }
      delete next[deleteId]
      return next
    })
    setCopiedId((current) => (current === deleteId ? null : current))
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

  if (keys.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-border/70 bg-card/80 px-8 py-12 text-center shadow-sm backdrop-blur">
          <div className="mb-6 flex size-[4.5rem] items-center justify-center rounded-3xl bg-muted text-foreground shadow-inner">
            <Vault className="size-8" />
          </div>
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

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search keys..."
            className="h-10 rounded-xl border-border/70 bg-card/70 pl-9 shadow-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
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
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            No keys match your search
          </div>
        ) : (
          filteredKeys.map((key) => {
            const platformTheme =
              PLATFORM_THEMES[key.platform] ?? PLATFORM_THEMES.Other

            return (
              <Card
                key={key.id}
                className="border-l-4 bg-card/85 shadow-sm ring-border/80 transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:bg-accent/40 hover:shadow-md"
                style={{ borderLeftColor: platformTheme.accent }}
              >
                <CardContent className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold"
                      style={{
                        color: platformTheme.accent,
                        backgroundColor: platformTheme.soft,
                        borderColor: platformTheme.soft,
                      }}
                    >
                      {platformTheme.initial}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-semibold tracking-tight">
                          {key.name}
                        </p>
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
