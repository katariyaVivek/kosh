"use client"

import { useSyncExternalStore } from "react"
import { MoonStar, Sun } from "lucide-react"
import { useTheme } from "next-themes"

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
    <div className="rounded-xl border border-slate-200 bg-slate-100/80 p-1 shadow-sm dark:border-sidebar-border dark:bg-background/80">
      <div className="grid grid-cols-2 gap-1">
        {THEME_OPTIONS.map(({ icon: Icon, label, value }) => {
          const active = mounted && resolvedTheme === value

          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                "flex h-9 items-center justify-center gap-2 rounded-lg text-xs font-medium transition-colors",
                active
                  ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200 dark:bg-sidebar dark:text-sidebar-foreground dark:ring-border"
                  : "text-slate-500 hover:bg-white/70 hover:text-slate-950 dark:text-muted-foreground dark:hover:bg-muted/40 dark:hover:text-foreground"
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
