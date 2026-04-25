"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

const REFRESH_INTERVAL_MS = 15_000
const DISABLE_AUTO_REFRESH =
  process.env.NEXT_PUBLIC_KOSH_DISABLE_LOCAL_USAGE_REFRESH === "1"

export function LocalUsageAutoRefresh({ disabled = false }: { disabled?: boolean }) {
  const router = useRouter()
  const isRefreshingRef = useRef(false)

  useEffect(() => {
    if (disabled || DISABLE_AUTO_REFRESH) {
      return
    }

    let cancelled = false

    async function refreshLocalUsage() {
      if (isRefreshingRef.current) {
        return
      }

      isRefreshingRef.current = true

      try {
        const response = await fetch("/api/usage-sources/local/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        })

        if (!cancelled && response.ok) {
          window.dispatchEvent(new Event("kosh:usage-refreshed"))
          router.refresh()
        }
      } finally {
        isRefreshingRef.current = false
      }
    }

    refreshLocalUsage()
    const intervalId = window.setInterval(
      refreshLocalUsage,
      REFRESH_INTERVAL_MS
    )

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [disabled, router])

  return null
}
