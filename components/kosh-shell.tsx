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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"

import { AddAlertDialog } from "@/components/add-alert-dialog"
import { AmbientVideoBackground } from "@/components/ambient-video-background"
import { BrandMark } from "@/components/brand-mark"
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
      usageSources?: { id: string; name: string; provider: string | null }[]
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { lock } = useLock()

  useKeyboardShortcuts([
    { key: "n", handler: () => setOpen(true), preventDefault: true },
    { key: "l", handler: () => lock(), preventDefault: true },
  ])

  const actionLabel =
    sidebarAction.kind === "alert" ? "Add alert" : "Add key"

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => !current)
  }

  return (
    <KoshShellContext.Provider
      value={{ openSidebarAction: () => setOpen(true) }}
    >
      <div className="relative isolate min-h-screen bg-background text-foreground">
        <AmbientVideoBackground />
        <div
          className={cn(
            "relative z-10 grid min-h-screen grid-cols-1 transition-[grid-template-columns] duration-200 ease-out md:grid-cols-[280px_minmax(0,1fr)]",
            sidebarCollapsed && "md:grid-cols-[84px_minmax(0,1fr)]"
          )}
        >
          <aside
            data-tour="sidebar"
            className="overflow-hidden border-b border-sidebar-border bg-sidebar/95 text-sidebar-foreground shadow-sm backdrop-blur-xl md:sticky md:top-0 md:h-screen md:border-r md:border-b-0 dark:bg-sidebar/92 dark:shadow-[0_24px_80px_hsl(222_34%_6%_/_0.22)]"
          >
            <div
              className={cn(
                "flex h-full flex-col gap-7 p-5 transition-[padding] duration-200 ease-out",
                sidebarCollapsed && "md:px-4"
              )}
            >
              <div
                className={cn(
                  "relative flex flex-row items-center gap-3 border-b border-sidebar-border pb-5",
                  sidebarCollapsed && "md:flex-col md:justify-center md:gap-2"
                )}
              >
                <div className="relative h-10 w-10 shrink-0">
                  <BrandMark fill sizes="40px" priority />
                </div>
                <div
                  className={cn(
                    "flex min-w-0 flex-col leading-tight transition-opacity duration-150",
                    sidebarCollapsed &&
                      "md:pointer-events-none md:h-0 md:w-0 md:overflow-hidden md:opacity-0"
                  )}
                >
                  <p className="text-sm font-semibold text-sidebar-foreground">
                    Kosh
                  </p>
                  <p className="text-xs text-sidebar-foreground/55">
                    API treasury
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className={cn(
                    "ml-auto hidden size-8 shrink-0 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground md:inline-flex",
                    sidebarCollapsed &&
                      "md:ml-0 md:bg-sidebar"
                  )}
                  aria-label={
                    sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
                  }
                  title={
                    sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
                  }
                >
                  {sidebarCollapsed ? (
                    <PanelLeftOpen className="size-4" />
                  ) : (
                    <PanelLeftClose className="size-4" />
                  )}
                </Button>
              </div>

              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href
                  const labelContent = (
                    <span
                      className={cn(
                        "flex items-center gap-2",
                        sidebarCollapsed && "md:justify-center"
                      )}
                    >
                      {item.icon ? (
                        <item.icon className="size-4 text-current" />
                      ) : null}
                      <span
                        className={cn(
                          "transition-opacity duration-150",
                          sidebarCollapsed && "md:sr-only"
                        )}
                      >
                        {item.label}
                      </span>
                    </span>
                  )

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={cn(
                        "group flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-all",
                        sidebarCollapsed &&
                          "md:h-10 md:justify-center md:px-0 md:py-0",
                        isActive
                          ? "border-primary/35 bg-primary/10 text-foreground shadow-sm dark:text-sidebar-foreground dark:bg-primary/12 dark:shadow-[0_0_24px_hsl(188_95%_43%_/_0.1)]"
                          : "border-transparent text-sidebar-foreground/60 hover:border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      {labelContent}
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full transition-colors",
                          sidebarCollapsed && "md:hidden",
                          isActive
                            ? "bg-primary"
                            : "bg-transparent group-hover:bg-sidebar-foreground/25"
                        )}
                      />
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
                className={cn(
                  "h-10 w-full justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium shadow-[0_14px_40px_hsl(188_95%_43%_/_0.18)] transition-all hover:bg-primary/90 hover:shadow-[0_18px_52px_hsl(188_95%_43%_/_0.22)]",
                  sidebarCollapsed && "md:px-0"
                )}
                title={sidebarCollapsed ? actionLabel : undefined}
              >
                <Plus className="size-4" />
                <span
                  className={cn(
                    "transition-opacity duration-150",
                    sidebarCollapsed && "md:sr-only"
                  )}
                >
                  {actionLabel}
                </span>
              </Button>

              <div className="mt-auto space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => lock()}
                  className={cn(
                    "w-full justify-center gap-2 border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent",
                    sidebarCollapsed && "md:px-0"
                  )}
                  title={sidebarCollapsed ? "Lock Now" : undefined}
                >
                  <Lock className="size-4" />
                  <span
                    className={cn(
                      "transition-opacity duration-150",
                      sidebarCollapsed && "md:sr-only"
                    )}
                  >
                    Lock Now
                  </span>
                </Button>
                <div className={cn(sidebarCollapsed && "md:hidden")}>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </aside>

          <main className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_70rem_28rem_at_42%_-10rem,hsl(188_95%_43%_/_0.1),transparent_74%),linear-gradient(to_bottom,var(--background),transparent_70%)] dark:bg-[radial-gradient(ellipse_70rem_28rem_at_42%_-10rem,hsl(188_95%_43%_/_0.12),transparent_74%),linear-gradient(to_bottom,hsl(222_34%_6%_/_0.74),transparent_70%)]" />
            <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-8 sm:py-10">
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
            usageSources={sidebarAction.usageSources ?? []}
          />
        )}
      </div>
    </KoshShellContext.Provider>
  )
}
