"use client"

import {
  createContext,
  type ElementType,
  type ReactNode,
  useContext,
  useState,
} from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Plus,
  LayoutDashboard,
  KeyRound,
  Activity,
  BellRing,
  Settings2,
  Lock,
} from "lucide-react"

import { AddAlertDialog } from "@/components/add-alert-dialog"
import { AddKeyDialog } from "@/components/add-key-dialog"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useLock } from "@/components/lock-context"
import { useKeyboardShortcuts } from "@/components/keyboard-shortcuts"

type NavItem = {
  label: string
  href: string
  icon?: ElementType
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Vault", href: "/vault", icon: KeyRound },
  { label: "Pulse", href: "/pulse", icon: Activity },
  { label: "Alerts", href: "/alerts", icon: BellRing },
  { label: "Settings", href: "/settings", icon: Settings2 },
]

type SidebarAction =
  | { kind: "key"; hasKeys?: boolean }
  | {
      kind: "alert"
      keys: { id: string; name: string }[]
    }

const KoshShellContext = createContext<{ openSidebarAction: () => void }>({
  openSidebarAction: () => {},
})

export function useKoshShell() {
  return useContext(KoshShellContext)
}

export function KoshShell({
  children,
  sidebarAction = { kind: "key" },
}: {
  children: ReactNode
  sidebarAction?: SidebarAction
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { lock } = useLock()

  useKeyboardShortcuts([
    { key: "n", handler: () => setOpen(true), preventDefault: true },
    { key: "l", handler: () => lock(), preventDefault: true },
  ])

  const actionLabel =
    sidebarAction.kind === "alert" ? "Add alert" : "Add key"

  return (
    <KoshShellContext.Provider
      value={{ openSidebarAction: () => setOpen(true) }}
    >
      <div className="min-h-screen bg-background text-foreground">
        <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[256px_minmax(0,1fr)]">
          <aside data-tour="sidebar" className="border-b border-sidebar-border bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/85 lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
            <div className="flex h-full flex-col gap-6 p-4">
              <div className="flex flex-row items-center gap-3 px-2 pt-1 pb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white dark:bg-indigo-500">
                K
              </div>
                <div className="flex flex-col leading-tight">
                  <p className="text-sm font-semibold text-sidebar-foreground">
                    Kosh
                  </p>
                  <p className="text-xs text-muted-foreground">API treasury</p>
                </div>
              </div>

              <nav className="space-y-0.5">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href
                  const labelContent = (
                    <span className="flex items-center gap-2">
                      {item.icon ? (
                        <item.icon className="size-4 text-current" />
                      ) : null}
                      <span>{item.label}</span>
                    </span>
                  )

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-primary/8 border-l-2 border-primary text-primary font-medium"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      {labelContent}
                    </Link>
                  )
                })}
              </nav>

              <Button
                data-tour="add-key"
                onClick={() => {
                  if (sidebarAction.kind === "key" && !sidebarAction.hasKeys) {
                    sessionStorage.setItem("kosh_celebration", "first_key")
                  }
                  setOpen(true)
                }}
                className="w-full justify-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow-sm transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                <Plus className="size-4" />
                {actionLabel}
              </Button>

              <div className="mt-auto space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => lock()}
                  className="w-full justify-center gap-2"
                >
                  <Lock className="size-4" />
                  Lock Now
                </Button>
                <ThemeToggle />
              </div>
            </div>
          </aside>

          <main className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-gradient-to-b from-muted/70 via-muted/20 to-transparent" />
            <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-8 sm:py-10">
              {children}
            </div>
          </main>
        </div>

        {sidebarAction.kind === "key" ? (
          <AddKeyDialog open={open} onOpenChange={setOpen} />
        ) : (
          <AddAlertDialog
            open={open}
            onOpenChange={setOpen}
            keys={sidebarAction.keys}
          />
        )}
      </div>
    </KoshShellContext.Provider>
  )
}
