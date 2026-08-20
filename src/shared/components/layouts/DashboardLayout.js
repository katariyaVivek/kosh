"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNotificationStore } from "@/store/notificationStore";
import { useHeaderSearchStore } from "@/store/headerSearchStore";
import { cn } from "@/shared/utils/cn";

function getToastStyle(type) {
  if (type === "success") {
    return {
      wrapper: "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
      icon: "check_circle",
    };
  }
  if (type === "error") {
    return {
      wrapper: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
      icon: "error",
    };
  }
  if (type === "warning") {
    return {
      wrapper: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      icon: "warning",
    };
  }
  return {
    wrapper: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    icon: "info",
  };
}

const GATEWAY_HUBS = [
  {
    id: "endpoint",
    label: "Keys & Endpoint",
    icon: "vpn_key",
    href: "/gateway/endpoint",
    match: ["/gateway", "/gateway/endpoint"],
    subTabs: [],
  },
  {
    id: "providers",
    label: "Providers & Models",
    icon: "dns",
    href: "/gateway/providers",
    match: ["/gateway/providers", "/gateway/combos", "/gateway/media-providers"],
    subTabs: [
      { label: "AI Providers", href: "/gateway/providers", match: ["/gateway/providers"] },
      { label: "Combos & Fallbacks", href: "/gateway/combos", match: ["/gateway/combos"] },
      { label: "Media & Web", href: "/gateway/media-providers/web", match: ["/gateway/media-providers"] },
    ],
  },
  {
    id: "tools",
    label: "CLI & Integrations",
    icon: "terminal",
    href: "/gateway/cli-tools",
    match: ["/gateway/cli-tools", "/gateway/mitm", "/gateway/skills"],
    subTabs: [
      { label: "CLI Tools", href: "/gateway/cli-tools", match: ["/gateway/cli-tools"] },
      { label: "MITM Proxy", href: "/gateway/mitm", match: ["/gateway/mitm"] },
      { label: "Agent Skills", href: "/gateway/skills", match: ["/gateway/skills"] },
    ],
  },
  {
    id: "analytics",
    label: "Usage & Analytics",
    icon: "bar_chart",
    href: "/gateway/usage",
    match: ["/gateway/usage", "/gateway/quota", "/gateway/token-saver"],
    subTabs: [
      { label: "Usage & Logs", href: "/gateway/usage", match: ["/gateway/usage"] },
      { label: "Quota Tracker", href: "/gateway/quota", match: ["/gateway/quota"] },
      { label: "Token Saver", href: "/gateway/token-saver", match: ["/gateway/token-saver"] },
    ],
  },
  {
    id: "settings",
    label: "Settings & System",
    icon: "settings",
    href: "/gateway/profile",
    match: ["/gateway/profile", "/gateway/proxy-pools", "/gateway/console-log", "/gateway/translator"],
    subTabs: [
      { label: "Gateway Settings", href: "/gateway/profile", match: ["/gateway/profile"] },
      { label: "Proxy Pools", href: "/gateway/proxy-pools", match: ["/gateway/proxy-pools"] },
      { label: "Console Log", href: "/gateway/console-log", match: ["/gateway/console-log"] },
      { label: "Translator", href: "/gateway/translator", match: ["/gateway/translator"] },
    ],
  },
];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const notifications = useNotificationStore((state) => state.notifications);
  const removeNotification = useNotificationStore((state) => state.removeNotification);

  const searchVisible = useHeaderSearchStore((s) => s.visible);
  const searchQuery = useHeaderSearchStore((s) => s.query);
  const searchPlaceholder = useHeaderSearchStore((s) => s.placeholder);
  const setSearchQuery = useHeaderSearchStore((s) => s.setQuery);

  const activeHub = useMemo(() => {
    return GATEWAY_HUBS.find((hub) =>
      hub.match.some((m) =>
        m === "/gateway"
          ? pathname === "/gateway" || pathname === "/gateway/endpoint"
          : pathname.startsWith(m)
      )
    ) || GATEWAY_HUBS[0];
  }, [pathname]);

  return (
    <div className="flex flex-col w-full min-w-0">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2 pointer-events-none">
        {notifications.map((n) => {
          const style = getToastStyle(n.type);
          return (
            <div
              key={n.id}
              className={`rounded-lg border px-3 py-2 shadow-lg backdrop-blur-md pointer-events-auto transition-all ${style.wrapper}`}
            >
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] leading-5">{style.icon}</span>
                <div className="min-w-0 flex-1">
                  {n.title ? <p className="text-xs font-semibold mb-0.5">{n.title}</p> : null}
                  <p className="text-xs whitespace-pre-wrap break-words">{n.message}</p>
                </div>
                {n.dismissible ? (
                  <button
                    type="button"
                    onClick={() => removeNotification(n.id)}
                    className="text-current/70 hover:text-current ml-1"
                    aria-label="Dismiss notification"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Gateway Integrated Header & Navigation */}
      <div className="flex flex-col gap-4 w-full mb-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_hsl(188_95%_43%_/_0.15)]">
              <span className="material-symbols-outlined text-[22px]">hub</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Gateway
                </h1>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25">
                  <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                  Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Multi-model proxy, intelligent routing, and unified AI provider aggregation
              </p>
            </div>
          </div>

          {/* Search bar when page registers search */}
          {searchVisible && (
            <div className="relative w-full sm:w-64 shrink-0">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[16px] pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder || "Search..."}
                className="w-full h-9 pl-8 pr-7 rounded-lg border border-border/80 bg-card/60 backdrop-blur-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  aria-label="Clear search"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Primary 5 Hubs Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 p-1 rounded-xl bg-secondary/30 border border-border/50">
          {GATEWAY_HUBS.map((hub) => {
            const isSelected = hub.id === activeHub.id;
            return (
              <Link
                key={hub.id}
                href={hub.href}
                className={cn(
                  "flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-center",
                  isSelected
                    ? "bg-card text-primary font-semibold shadow-sm border border-primary/25 dark:bg-card/90"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                )}
              >
                <span className={cn("material-symbols-outlined text-[17px]", isSelected ? "text-primary" : "text-muted-foreground")}>
                  {hub.icon}
                </span>
                <span className="truncate">{hub.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Secondary Sub-tabs for the Active Hub (if available) */}
        {activeHub.subTabs && activeHub.subTabs.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 scrollbar-none">
            <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mr-1 shrink-0">
              Section:
            </span>
            {activeHub.subTabs.map((subTab) => {
              const isSubSelected = subTab.match.some((m) => pathname.startsWith(m));
              return (
                <Link
                  key={subTab.label}
                  href={subTab.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all",
                    isSubSelected
                      ? "bg-primary/15 text-primary font-semibold border border-primary/30 shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent"
                  )}
                >
                  <span>{subTab.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Gateway Page Content */}
      <div className="w-full min-w-0">
        {children}
      </div>
    </div>
  );
}
