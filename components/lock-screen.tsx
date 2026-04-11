"use client"

import { useState, useEffect, useRef } from "react"
import { Lock, Check, KeyRound, AlertCircle } from "lucide-react"
import { useLock } from "@/components/lock-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function LockScreen() {
  const { isLocked, unlock } = useLock()
  const [masterKey, setMasterKey] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Handle mount/unmount animation
  useEffect(() => {
    if (isLocked) {
      setIsVisible(true)
      setMasterKey("")
      setError("")
      setLoading(false)
      setSuccess(false)
      // Focus input after animation starts
      setTimeout(() => inputRef.current?.focus(), 300)
    } else {
      // If unlocked via success animation, keep visible until animation finishes
      if (success) {
        const timer = setTimeout(() => setIsVisible(false), 800)
        return () => clearTimeout(timer)
      }
      setIsVisible(false)
    }
  }, [isLocked, success])

  // Trigger shake on error
  useEffect(() => {
    if (error) {
      setIsShaking(true)
      const timer = setTimeout(() => setIsShaking(false), 500)
      return () => clearTimeout(timer)
    }
  }, [error])

  const handleUnlock = async () => {
    if (!masterKey) return

    setLoading(true)
    setError("")

    try {
      const success = await unlock(masterKey)
      if (success) {
        setSuccess(true)
        // Small delay to show success animation before unmount
        await new Promise((resolve) => setTimeout(resolve, 600))
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

  if (!isLocked && !isVisible) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xl transition-opacity duration-300 ease-out",
        isVisible ? "opacity-100" : "opacity-0"
      )}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div
        className={cn(
          "relative z-10 w-full max-w-sm mx-4 transition-all duration-300 ease-out",
          isVisible ? "translate-y-0 scale-100" : "translate-y-4 scale-95"
        )}
      >
        <div className="flex flex-col items-center rounded-2xl border border-border bg-card/50 p-8 shadow-2xl backdrop-blur-md">
          {/* Animated Icon */}
          <div
            className={cn(
              "mb-6 flex size-20 items-center justify-center rounded-full border transition-colors duration-300",
              success
                ? "border-emerald-500/30 bg-emerald-500/10"
                : error
                ? "border-destructive/30 bg-destructive/10"
                : "border-primary/20 bg-primary/10"
            )}
          >
            {success ? (
              <Check className="size-10 text-emerald-500 animate-in zoom-in duration-300" />
            ) : (
              <div className={error ? "animate-shake" : ""}>
                {error ? (
                  <AlertCircle className="size-10 text-destructive" />
                ) : (
                  <KeyRound className="size-10 text-primary animate-pulse" />
                )}
              </div>
            )}
          </div>

          {/* Text */}
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-foreground">
              {success ? "Unlocked" : "Vault Locked"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {success
                ? "Redirecting to dashboard..."
                : "Enter your master key to decrypt and continue"}
            </p>
          </div>

          {/* Input Field */}
          <div className={cn("w-full space-y-3", error && "animate-shake")}>
            <div className="relative">
              <input
                ref={inputRef}
                type="password"
                placeholder="Master Key"
                value={masterKey}
                onChange={(e) => {
                  setMasterKey(e.target.value)
                  if (error) setError("")
                }}
                onKeyDown={handleKeyDown}
                disabled={loading || success}
                className="h-12 w-full rounded-xl border border-input bg-background/50 px-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
            </div>

            {/* Error Message */}
            <div className="h-5 overflow-hidden">
              {error && (
                <p className="text-xs text-destructive animate-in slide-in-from-top-2 duration-200">
                  {error}
                </p>
              )}
            </div>

            {/* Button */}
            <Button
              onClick={handleUnlock}
              disabled={!masterKey || loading || success}
              className={cn(
                "h-11 w-full rounded-xl font-medium transition-all duration-300",
                success
                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {success ? "Success" : loading ? "Verifying..." : "Unlock"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

