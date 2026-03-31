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
  Settings,
  LayoutDashboard,
  KeyRound,
  Activity,
  BellRing,
  Settings2,
  Shield,
} from "lucide-react"

import { AddAlertDialog } from "@/components/add-alert-dialog"
import { AddKeyDialog } from "@/components/add-key-dialog"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
  | { kind: "key" }
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

  const actionLabel =
    sidebarAction.kind === "alert" ? "Add alert" : "Add key"

  return (
    <KoshShellContext.Provider
      value={{ openSidebarAction: () => setOpen(true) }}
    >
      <div className="min-h-screen bg-background text-foreground">
        <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="border-b border-sidebar-border bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/85 lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
            <div className="flex h-full flex-col gap-6 p-4">
              <div className="flex items-center gap-3 px-2 pt-1">
                <div className="flex size-10 items-center justify-center rounded-xl border border-sidebar-border bg-background text-sidebar-foreground shadow-sm">
                  <Shield className="size-5 text-sidebar-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight text-sidebar-foreground">
                    Kosh
                  </p>
                  <p className="text-xs text-muted-foreground">API treasury</p>
                </div>
              </div>

              <nav className="space-y-1">
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
                        "flex items-center rounded-xl px-3 py-2.5 text-sm transition-colors",
                        isActive
                          ? "justify-between bg-sidebar-accent font-medium text-sidebar-foreground shadow-sm ring-1 ring-sidebar-border"
                          : "gap-2 text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      )}
                    >
                      {labelContent}
                    </Link>
                  )
                })}
              </nav>

              <Button
                onClick={() => setOpen(true)}
                className="w-full justify-center gap-2 rounded-xl shadow-sm"
              >
                <Plus className="size-4" />
                {actionLabel}
              </Button>

              <div className="mt-auto">
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
