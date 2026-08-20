"use client";

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { APP_CONFIG } from "@/shared/constants/config";
import { MEDIA_PROVIDER_KINDS } from "@/shared/constants/providers";

const VISIBLE_MEDIA_KINDS = ["embedding", "image", "video", "tts", "stt"];
const COMBINED_WEB_ITEM = { id: "web", label: "Web Fetch & Search", icon: "travel_explore", href: "/gateway/media-providers/web" };

const navItems = [
  { href: "/gateway/endpoint", label: "Endpoint & Key", icon: "api" },
  { href: "/gateway/providers", label: "Providers", icon: "dns" },
  { href: "/gateway/combos", label: "Combo & Vision Adapter", icon: "layers" },
  { href: "/gateway/usage", label: "Usage", icon: "bar_chart" },
  { href: "/gateway/quota", label: "Quota Tracker", icon: "data_usage" },
  { href: "/gateway/token-saver", label: "Token Saver", icon: "savings" },
  { href: "/gateway/cli-tools", label: "CLI Tools", icon: "terminal" },
];

const debugItems = [
  { href: "/gateway/console-log", label: "Console Log", icon: "terminal" },
  { href: "/gateway/translator", label: "Translator", icon: "translate" },
];

const systemItems = [
  { href: "/gateway/proxy-pools", label: "Proxy Pools", icon: "lan" },
  { href: "/gateway/skills", label: "Agent Skills", icon: "extension" },
];

export default function Sidebar({ onClose }) {
  const pathname = usePathname();
  const [mediaOpen, setMediaOpen] = useState(false);
  const [enableTranslator, setEnableTranslator] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => { if (data.enableTranslator) setEnableTranslator(true); })
      .catch(() => {});
  }, []);

  const isActive = (href) => {
    if (href === "/gateway/endpoint") {
      return pathname === "/gateway" || pathname.startsWith("/gateway/endpoint");
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="flex w-64 flex-col border-r border-border-subtle bg-vibrancy backdrop-blur-xl transition-colors duration-300 min-h-full">
      {/* Branding Header */}
      <div className="px-5 py-4 flex flex-col gap-1 border-b border-border-subtle/40">
        <Link href="/gateway" className="flex items-center gap-3">
          <div className="flex items-center justify-center size-8 rounded-[9px] bg-gradient-to-br from-primary to-primary/80 shadow-[var(--shadow-warm)]">
            <span className="material-symbols-outlined text-primary-foreground text-[18px]">hub</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold tracking-tight text-text-main">
              {APP_CONFIG.name}
            </h1>
            <span className="text-[11px] text-text-muted">Kosh Plugin</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all group",
              isActive(item.href)
                ? "bg-primary/10 text-primary font-medium"
                : "text-text-muted hover:bg-surface-2 hover:text-text-main"
            )}
          >
            <span
              className={cn(
                "material-symbols-outlined text-[18px]",
                isActive(item.href) ? "fill-1 text-primary" : "group-hover:text-primary transition-colors"
              )}
            >
              {item.icon}
            </span>
            <span className="text-[13px]">{item.label}</span>
          </Link>
        ))}

        {/* System section */}
        <div className="pt-3 mt-2 space-y-0.5">
          <p className="px-3 text-[11px] font-semibold text-text-muted/60 uppercase tracking-wider mb-1.5">
            System & Routing
          </p>

          {/* Media Providers accordion */}
          <button
            onClick={() => setMediaOpen((v) => !v)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all group",
              pathname.startsWith("/gateway/media-providers")
                ? "bg-primary/10 text-primary font-medium"
                : "text-text-muted hover:bg-surface-2 hover:text-text-main"
            )}
          >
            <span className="material-symbols-outlined text-[18px]">perm_media</span>
            <span className="text-[13px] flex-1 text-left">Media Providers</span>
            <span className="material-symbols-outlined text-[14px] transition-transform" style={{ transform: mediaOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
              expand_more
            </span>
          </button>
          {mediaOpen && (
            <div className="pl-3 space-y-0.5">
              {MEDIA_PROVIDER_KINDS.filter((k) => VISIBLE_MEDIA_KINDS.includes(k.id)).map((kind) => (
                <Link
                  key={kind.id}
                  href={`/gateway/media-providers/${kind.id}`}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-1 rounded-lg transition-all group",
                    pathname.startsWith(`/gateway/media-providers/${kind.id}`)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-text-muted hover:bg-surface-2 hover:text-text-main"
                  )}
                >
                  <span className="material-symbols-outlined text-[15px]">{kind.icon}</span>
                  <span className="text-xs">{kind.label}</span>
                </Link>
              ))}
              <Link
                key={COMBINED_WEB_ITEM.id}
                href={COMBINED_WEB_ITEM.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-1 rounded-lg transition-all group",
                  pathname.startsWith(COMBINED_WEB_ITEM.href)
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-text-muted hover:bg-surface-2 hover:text-text-main"
                )}
              >
                <span className="material-symbols-outlined text-[15px]">{COMBINED_WEB_ITEM.icon}</span>
                <span className="text-xs">{COMBINED_WEB_ITEM.label}</span>
              </Link>
            </div>
          )}

          {systemItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all group",
                isActive(item.href)
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-text-muted hover:bg-surface-2 hover:text-text-main"
              )}
            >
              <span
                className={cn(
                  "material-symbols-outlined text-[18px]",
                  isActive(item.href) ? "fill-1 text-primary" : "group-hover:text-primary transition-colors"
                )}
              >
                {item.icon}
              </span>
              <span className="text-[13px]">{item.label}</span>
            </Link>
          ))}

          {/* Debug items */}
          {debugItems.map((item) => {
            const show = item.href !== "/gateway/translator" || enableTranslator;
            return show ? (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all group",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-text-muted hover:bg-surface-2 hover:text-text-main"
                )}
              >
                <span
                  className={cn(
                    "material-symbols-outlined text-[18px]",
                    isActive(item.href) ? "fill-1 text-primary" : "group-hover:text-primary transition-colors"
                  )}
                >
                  {item.icon}
                </span>
                <span className="text-[13px]">{item.label}</span>
              </Link>
            ) : null;
          })}

          {/* Settings */}
          <Link
            href="/gateway/profile"
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all group",
              isActive("/gateway/profile")
                ? "bg-primary/10 text-primary font-medium"
                : "text-text-muted hover:bg-surface-2 hover:text-text-main"
            )}
          >
            <span
              className={cn(
                "material-symbols-outlined text-[18px]",
                isActive("/gateway/profile") ? "fill-1 text-primary" : "group-hover:text-primary transition-colors"
              )}
            >
              settings
            </span>
            <span className="text-[13px]">Settings</span>
          </Link>
        </div>
      </nav>
    </aside>
  );
}

Sidebar.propTypes = {
  onClose: PropTypes.func,
};
