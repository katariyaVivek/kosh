"use client"

import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  useContext,
} from "react"

type AutoLockTimeout = "never" | "15" | "30" | "60" | "120"

interface LockContextValue {
  isLocked: boolean
  lock: () => void
  unlock: (masterKey: string) => Promise<boolean>
  setTimeout: (minutes: AutoLockTimeout) => void
  getTimeout: () => AutoLockTimeout
}

export const LockContext = createContext<LockContextValue>({
  isLocked: false,
  lock: () => {},
  unlock: async () => false,
  setTimeout: () => {},
  getTimeout: () => "never",
})

export function useLock() {
  return useContext(LockContext)
}

const TIMEOUT_KEY = "kosh_auto_lock_timeout"
const LOCK_KEY = "kosh_master_key_hash"

function getStoredTimeout(): AutoLockTimeout {
  if (typeof window === "undefined") return "never"
  return (localStorage.getItem(TIMEOUT_KEY) as AutoLockTimeout) || "never"
}

function setStoredTimeout(minutes: AutoLockTimeout): void {
  localStorage.setItem(TIMEOUT_KEY, minutes)
}

function hashKey(key: string): string {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return hash.toString(16)
}

export function LockProvider({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(false)
  const [timeout, setTimeoutState] = useState<AutoLockTimeout>("never")
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const storedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    setTimeoutState(getStoredTimeout())
  }, [])

  useEffect(() => {
    const savedHash = localStorage.getItem(LOCK_KEY)
    if (savedHash) {
      storedKeyRef.current = savedHash
    }
  }, [])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    clearTimer()
    if (timeout === "never") return

    const minutes = parseInt(timeout, 10)
    if (isNaN(minutes)) return

    timerRef.current = setTimeout(() => {
      setIsLocked(true)
    }, minutes * 60 * 1000)
  }, [timeout, clearTimer])

  const resetTimer = useCallback(() => {
    if (!isLocked && timeout !== "never") {
      startTimer()
    }
  }, [isLocked, timeout, startTimer])

  useEffect(() => {
    if (isLocked) {
      clearTimer()
      return
    }

    const events = ["mousemove", "keydown", "click", "scroll"]
    events.forEach((event) => {
      window.addEventListener(event, resetTimer)
    })

    startTimer()

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer)
      })
      clearTimer()
    }
  }, [isLocked, resetTimer, startTimer, clearTimer])

  const lock = useCallback(() => {
    setIsLocked(true)
    clearTimer()
  }, [clearTimer])

  const unlock = useCallback(async (masterKey: string): Promise<boolean> => {
    if (!masterKey || masterKey.length < 1) {
      return false
    }
    
    try {
      const res = await fetch("/api/settings/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterKey }),
      })
      
      const data = await res.json()
      
      if (!res.ok || !data.valid) {
        console.log("Invalid master key")
        return false
      }
    } catch (e) {
      console.log("Unlock validation failed:", e)
      return false
    }
    
    const inputHash = hashKey(masterKey)
    storedKeyRef.current = inputHash
    localStorage.setItem(LOCK_KEY, inputHash)

    setIsLocked(false)
    startTimer()
    return true
  }, [startTimer])

  const setTimeoutFn = useCallback((minutes: AutoLockTimeout) => {
    setTimeoutState(minutes)
    setStoredTimeout(minutes)
  }, [])

  const getTimeout = useCallback((): AutoLockTimeout => {
    return timeout
  }, [timeout])

  return (
    <LockContext.Provider
      value={{
        isLocked,
        lock,
        unlock,
        setTimeout: setTimeoutFn,
        getTimeout,
      }}
    >
      {children}
    </LockContext.Provider>
  )
}
