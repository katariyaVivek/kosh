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
        <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside
            data-tour="sidebar"
            className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0 dark:shadow-[0_24px_80px_hsl(222_34%_6%_/_0.22)]"
          >
            <div className="flex h-full flex-col gap-7 p-5">
              <div className="flex flex-row items-center gap-3 border-b border-sidebar-border pb-5">
                <div className="relative h-10 w-10 shrink-0">
                  <BrandMark fill sizes="40px" priority />
                </div>
                <div className="flex flex-col leading-tight">
                  <p className="text-sm font-semibold text-sidebar-foreground">
                    Kosh
                  </p>
                  <p className="text-xs text-sidebar-foreground/55">
                    API treasury
                  </p>
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
                        "group flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-all",
                        isActive
                          ? "border-primary/35 bg-primary/10 text-foreground shadow-sm dark:text-sidebar-foreground dark:bg-primary/12 dark:shadow-[0_0_24px_hsl(188_95%_43%_/_0.1)]"
                          : "border-transparent text-sidebar-foreground/60 hover:border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      {labelContent}
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full transition-colors",
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
                className="h-10 w-full justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium shadow-[0_14px_40px_hsl(188_95%_43%_/_0.18)] transition-all hover:bg-primary/90 hover:shadow-[0_18px_52px_hsl(188_95%_43%_/_0.22)]"
              >
                <Plus className="size-4" />
                {actionLabel}
              </Button>

              <div className="mt-auto space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => lock()}
                    className="w-full justify-center gap-2 border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                  <Lock className="size-4" />
                  Lock Now
                </Button>
                <ThemeToggle />
              </div>
            </div>
          </aside>

          <main className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_70rem_28rem_at_42%_-10rem,hsl(188_95%_43%_/_0.12),transparent_74%),radial-gradient(ellipse_40rem_20rem_at_80%_0%,hsl(188_95%_43%_/_0.04),transparent_64%),linear-gradient(to_bottom,hsl(214_33%_88%_/_0.28),transparent_60%)] dark:bg-[radial-gradient(ellipse_70rem_28rem_at_42%_-10rem,hsl(188_95%_43%_/_0.14),transparent_74%),radial-gradient(ellipse_40rem_20rem_at_80%_0%,hsl(188_95%_43%_/_0.06),transparent_64%),linear-gradient(to_bottom,hsl(220_24%_14%_/_0.08),transparent_60%)]" />
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
