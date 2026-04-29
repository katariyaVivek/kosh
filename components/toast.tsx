"use client"

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react"
import { CheckCircle2, XCircle, X, AlertCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToastType = "success" | "error" | "info" | "warning"

export type Toast = {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
}

type ToastContextType = {
  toast: (opts: Omit<Toast, "id">) => string
  success: (title: string, description?: string) => string
  error: (title: string, description?: string) => string
  info: (title: string, description?: string) => string
  warning: (title: string, description?: string) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

const TOAST_ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertCircle,
}

const TOAST_COLORS: Record<ToastType, string> = {
  success: "border-success/30 bg-success-soft text-success",
  error: "border-error/30 bg-error-soft text-error",
  info: "border-info/30 bg-info-soft text-info",
  warning: "border-warning/30 bg-warning-soft text-warning",
}

let nextId = 0

function generateId() {
  return `toast-${Date.now()}-${++nextId}`
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<string, number>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const enqueue = useCallback(
    (opts: Omit<Toast, "id">) => {
      const id = generateId()
      const duration = opts.duration ?? 4000
      setToasts((prev) => [...prev, { ...opts, id }])
      const timer = window.setTimeout(() => dismiss(id), duration)
      timers.current.set(id, timer)
      return id
    },
    [dismiss]
  )

  const toast = useCallback(
    (opts: Omit<Toast, "id">) => enqueue(opts),
    [enqueue]
  )

  const success = useCallback(
    (title: string, description?: string) =>
      enqueue({ type: "success", title, description }),
    [enqueue]
  )

  const error = useCallback(
    (title: string, description?: string) =>
      enqueue({ type: "error", title, description }),
    [enqueue]
  )

  const info = useCallback(
    (title: string, description?: string) =>
      enqueue({ type: "info", title, description }),
    [enqueue]
  )

  const warning = useCallback(
    (title: string, description?: string) =>
      enqueue({ type: "warning", title, description }),
    [enqueue]
  )

  return (
    <ToastContext.Provider
      value={{ toast, success, error, info, warning, dismiss }}
    >
      {children}
      <div
        className="pointer-events-none fixed inset-0 z-[9999] flex items-end justify-end p-4 sm:p-6"
        aria-live="polite"
      >
        <div className="flex flex-col gap-3 max-w-sm w-full pointer-events-auto">
          {toasts.map((t) => {
            const Icon = TOAST_ICONS[t.type]
            return (
              <div
                key={t.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-md",
                  TOAST_COLORS[t.type]
                )}
                role="alert"
              >
                <Icon className="mt-0.5 size-4 shrink-0" />
                <div className="flex-1 space-y-0.5">
                  <p className="font-medium">{t.title}</p>
                  {t.description ? (
                    <p className="text-xs opacity-80">{t.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                  aria-label="Dismiss"
                >
                  <X className="size-4" />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return ctx
}
