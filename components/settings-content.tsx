"use client"

import {
  AlertTriangle,
  Check,
  Database,
  Download,
  Info,
  Palette,
  ShieldCheck,
  Upload,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useTheme } from "@/components/theme-provider"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { ChangeMasterKeyDialog } from "@/components/change-master-key-dialog"
import { useLock } from "@/components/lock-context"

const THEME_OPTIONS = [
  {
    label: "Light",
    value: "light",
    description: "Bright workspace",
    preview: "from-white/90 to-slate-200",
  },
  {
    label: "Dark",
    value: "dark",
    description: "Low-light friendly",
    preview: "from-slate-900 to-slate-700",
  },
  {
    label: "System",
    value: "system",
    description: "Follow OS",
    preview: "from-muted to-background",
  },
]

const AUTO_LOCK_OPTIONS = ["Never", "15 minutes", "30 minutes", "1 hour"]


const MASTER_KEY_MASK = "••••••••••••••••"

export function SettingsContent() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { theme, setTheme } = useTheme()
  const { getTimeout, setTimeout: setLockTimeout } = useLock()
  const [mounted, setMounted] = useState(false)
  const [autoLock, setAutoLock] = useState(AUTO_LOCK_OPTIONS[0])
  const [exportLoading, setExportLoading] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [isPurgeOpen, setIsPurgeOpen] = useState(false)
  const [purgeInput, setPurgeInput] = useState("")
  const [isPurging, setIsPurging] = useState(false)
  const [isChangeKeyOpen, setIsChangeKeyOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!importMessage) return
    const timeout = setTimeout(() => setImportMessage(null), 4000)
    return () => clearTimeout(timeout)
  }, [importMessage])

  const handleExport = useCallback(async () => {
    setExportLoading(true)

    try {
      const res = await fetch("/api/settings/export")
      if (!res.ok) {
        throw new Error("Failed to export vault")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      const filename = `kosh-export-${new Date().toISOString().split("T")[0]}.json`
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setImportMessage("Export ready for download")
    } catch (error) {
      setImportMessage(
        error instanceof Error ? error.message : "Export failed"
      )
    } finally {
      setExportLoading(false)
    }
  }, [])

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleImportFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const payload = JSON.parse(text)

        const res = await fetch("/api/settings/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => null)
          throw new Error(
            errorData?.error ?? "Import failed"
          )
        }

        const result = await res.json()
        setImportMessage(
          `Imported ${result.imported} keys, skipped ${result.skipped} duplicates`
        )
      } catch (error) {
        setImportMessage(
          error instanceof Error ? error.message : "Import failed"
        )
      } finally {
        event.target.value = ""
      }
    },
    []
  )

  const handlePurge = useCallback(async () => {
    setIsPurging(true)
    try {
      const res = await fetch("/api/settings/purge", { method: "DELETE" })
      if (!res.ok) {
        throw new Error("Unable to purge data")
      }
      router.push("/vault")
    } catch (error) {
      setImportMessage(
        error instanceof Error ? error.message : "Purge failed"
      )
    } finally {
      setIsPurging(false)
      setIsPurgeOpen(false)
      setPurgeInput("")
    }
  }, [router])

  const activeTheme = mounted && (theme ?? "system")

  const themeCards = useMemo(
    () =>
      THEME_OPTIONS.map((option) => {
        const isActive = activeTheme === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value as "light" | "dark" | "system")}
            className={cn(
              "flex flex-col gap-3 rounded-2xl border px-5 py-4 text-left transition-shadow",
              isActive
                ? "border-sidebar-foreground text-foreground shadow-lg"
                : "border-border/70 bg-card/60 text-muted-foreground hover:border-border/80"
            )}
            aria-pressed={isActive}
          >
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>{option.label}</span>
              {isActive ? <Check className="size-4" /> : null}
            </div>
            <div
              className={cn(
                "h-10 w-full rounded-xl border border-border/70 bg-gradient-to-r",
                option.preview
              )}
            />
            <p className="text-xs text-muted-foreground">{option.description}</p>
          </button>
        )
      }),
    [activeTheme, setTheme]
  )

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage security, data, and appearance.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="rounded-xl border border-border bg-card shadow-sm">
            <CardContent className="space-y-6 px-6 py-6">
              <div className="mb-5 flex items-center gap-2 border-b border-border pb-3 text-base font-semibold text-foreground">
                <ShieldCheck className="size-4 text-muted-foreground" />
                Security
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/40 px-4 py-3">
                  <code className="flex-1 text-sm font-mono tracking-[0.2em] text-muted-foreground">
                    {MASTER_KEY_MASK}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsChangeKeyOpen(true)}
                  >
                    Change
                  </Button>
                </div>
                <div className="flex items-start gap-2 rounded-2xl border border-warning/50 bg-warning-soft px-4 py-3 text-xs text-warning">
                  <AlertTriangle className="size-4" />
                  <p>
                    This key encrypts all your API keys. Never share it. Back it
                    up somewhere safe.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Auto-lock Timeout
                </label>
                <Select
                  value={getTimeout()}
                  onValueChange={(value: "never" | "15" | "30" | "60" | "120") =>
                    setLockTimeout(value)
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-xl border-border/70 bg-background/80 px-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" className="rounded-xl">
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border bg-card shadow-sm">
            <CardContent className="space-y-4 px-6 py-6">
              <div className="mb-5 flex items-center gap-2 border-b border-border pb-3 text-base font-semibold text-foreground">
                <Database className="size-4 text-muted-foreground" />
                Data Management
              </div>

              <div className="space-y-2">
                <Button
                  variant="default"
                  onClick={handleExport}
                  disabled={exportLoading}
                  className="w-full justify-center gap-2"
                >
                  <Download className="size-4" />
                  Export Vault
                </Button>
                <p className="text-xs text-muted-foreground">
                  Exports all key metadata and usage history. Encrypted key
                  values are not included for security.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleImportClick}
                    className="w-full justify-center gap-2"
                  >
                    <Upload className="size-4" />
                    Import Backup
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportFile}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Import a previously exported Kosh backup file.
                </p>
                {importMessage ? (
                  <div className="rounded-2xl bg-success-soft px-3 py-2 text-xs text-success">
                    {importMessage}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-xl border border-border bg-card shadow-sm">
            <CardContent className="space-y-4 px-6 py-6">
              <div className="mb-5 flex items-center gap-2 border-b border-border pb-3 text-base font-semibold text-foreground">
                <Palette className="size-4 text-muted-foreground" />
                Appearance
              </div>
              <div className="grid gap-4 sm:grid-cols-3">{themeCards}</div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border bg-muted/40">
            <CardContent className="space-y-3 px-5 py-5">
              <div className="mb-5 flex items-center gap-2 border-b border-border pb-3 text-base font-semibold text-foreground">
                <Info className="size-4 text-muted-foreground" />
                About
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between text-foreground">
                  <span>Version</span>
                  <span>1.0.0-local</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Built with</span>
                  <span>Next.js, Prisma, shadcn/ui</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Encryption</span>
                  <span>AES-256</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>License</span>
                  <span>MIT</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Kosh — Your API Treasury
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="rounded-xl border border-red-200 bg-red-50/30 dark:border-red-900/50 dark:bg-red-950/30">
        <CardContent className="space-y-4 px-6 py-6">
          <div className="mb-5 border-b border-border pb-3 text-base font-semibold text-destructive">
            Danger Zone
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Permanently delete all keys, usage logs, and alerts.
            </p>
            <Button
              variant="destructive"
              onClick={() => setIsPurgeOpen(true)}
              className="sm:w-auto"
            >
              Purge All Data
            </Button>
          </div>
          <Dialog open={isPurgeOpen} onOpenChange={setIsPurgeOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Purge All Data</DialogTitle>
                <DialogDescription>
                  This will permanently delete all keys, usage logs, and
                  alerts. Type PURGE to confirm.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Type PURGE to confirm"
                  value={purgeInput}
                  onChange={(event) => setPurgeInput(event.target.value)}
                  autoComplete="off"
                  className="bg-muted/60"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsPurgeOpen(false)}
                  disabled={isPurging}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={purgeInput !== "PURGE" || isPurging}
                  onClick={handlePurge}
                >
                  {isPurging ? "Purging..." : "Purge All Data"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <ChangeMasterKeyDialog
            open={isChangeKeyOpen}
            onOpenChange={setIsChangeKeyOpen}
          />
        </CardContent>
      </Card>
    </div>
  )
}
