"use client"

import { useSyncExternalStore } from "react"
import { MoonStar, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"

import { cn } from "@/lib/utils"

const THEME_OPTIONS = [
  { label: "Light", value: "light", icon: Sun },
  { label: "Dark", value: "dark", icon: MoonStar },
] as const

const subscribe = () => () => {}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(subscribe, () => true, () => false)

  return (
    <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-1 shadow-sm">
      <div className="grid grid-cols-2 gap-1">
        {THEME_OPTIONS.map(({ icon: Icon, label, value }) => {
          const active = mounted && resolvedTheme === value

          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                "flex h-9 items-center justify-center gap-2 rounded-lg text-xs font-medium transition-all",
                active
                  ? "bg-sidebar text-sidebar-foreground shadow-sm ring-1 ring-sidebar-border"
                  : "text-sidebar-foreground/55 hover:bg-sidebar hover:text-sidebar-foreground"
              )}
              aria-pressed={active}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
