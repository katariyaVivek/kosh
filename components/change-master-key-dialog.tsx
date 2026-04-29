"use client"

import { useEffect, useState } from "react"

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
import { Label } from "@/components/ui/label"

export function ChangeMasterKeyDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [newKey, setNewKey] = useState("")
  const [confirmKey, setConfirmKey] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setNewKey("")
      setConfirmKey("")
      setError(null)
      setSuccess(null)
    }
  }, [open])

  const isValid = newKey.length >= 12 && newKey === confirmKey

  const handleSubmit = async () => {
    if (!isValid) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch("/api/settings/master-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newMasterKey: newKey }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Rotation failed")
        return
      }

      setSuccess(
        `Master key rotated and saved. Re-encrypted ${data.rotatedCount} keys.`
      )

      setTimeout(() => {
        onOpenChange(false)
        window.location.reload()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rotation failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Master Key</DialogTitle>
          <DialogDescription>
            All stored API keys will be re-encrypted with your new master key.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>New Master Key</Label>
            <Input
              type="password"
              placeholder="Enter new master key (min 12 characters)"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
            />
            {newKey.length > 0 && newKey.length < 12 && (
              <p className="text-xs text-destructive">
                Must be at least 12 characters
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Confirm New Master Key</Label>
            <Input
              type="password"
              placeholder="Confirm new master key"
              value={confirmKey}
              onChange={(e) => setConfirmKey(e.target.value)}
            />
            {confirmKey.length > 0 && newKey !== confirmKey && (
              <p className="text-xs text-destructive">Keys do not match</p>
            )}
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md bg-success-soft px-3 py-2 text-sm text-success">
              {success}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || loading}>
            {loading ? "Rotating..." : "Rotate Key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
