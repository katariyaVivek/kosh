"use client"

import { useState } from "react"
import { Lock } from "lucide-react"
import { useLock } from "@/components/lock-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

export function LockScreen() {
  const { unlock } = useLock()
  const [masterKey, setMasterKey] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleUnlock = async () => {
    if (!masterKey) return

    setLoading(true)
    setError("")

    try {
      const success = await unlock(masterKey)
      if (success) {
        setMasterKey("")
      } else {
        setError("Invalid master key")
      }
    } catch {
      setError("Failed to unlock")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleUnlock()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="flex flex-col items-center gap-6 pt-8 pb-8">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
            <Lock className="size-8 text-primary" />
          </div>
          
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Vault Locked</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your master key to unlock
            </p>
          </div>

          <div className="w-full space-y-4">
            <div className="space-y-2">
              <Label htmlFor="masterKey">Master Key</Label>
              <Input
                id="masterKey"
                type="password"
                placeholder="Enter master key"
                value={masterKey}
                onChange={(e) => setMasterKey(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              onClick={handleUnlock}
              disabled={!masterKey || loading}
              className="w-full"
            >
              {loading ? "Unlocking..." : "Unlock"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
