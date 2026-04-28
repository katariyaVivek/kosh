"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  useState,
} from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  attribute?: "class" | "data-theme"
}

type ThemeState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: "dark" | "light"
}

const ThemeContext = createContext<ThemeState | null>(null)

const STORAGE_KEY = "theme"

function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "dark" || stored === "light" || stored === "system") {
      return stored
    }
  } catch {}
  return null
}

function getSystemDark(): boolean {
  if (typeof matchMedia === "undefined") return false
  return matchMedia("(prefers-color-scheme: dark)").matches
}

function subscribeToSystemDark(onChange: () => void) {
  if (typeof matchMedia === "undefined") return () => {}
  const mq = matchMedia("(prefers-color-scheme: dark)")
  mq.addEventListener("change", onChange)
  return () => mq.removeEventListener("change", onChange)
}

function applyTheme(resolved: "dark" | "light", attribute: "class" | "data-theme") {
  const root = document.documentElement
  if (attribute === "class") {
    root.classList.toggle("dark", resolved === "dark")
  } else {
    root.setAttribute("data-theme", resolved)
  }
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  disableTransitionOnChange,
  attribute = "class",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme() ?? defaultTheme)

  const isSystemDark = useSyncExternalStore(
    subscribeToSystemDark,
    getSystemDark,
    () => false,
  )

  const resolvedTheme = theme === "system" ? (isSystemDark ? "dark" : "light") : theme

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme)
      try {
        localStorage.setItem(STORAGE_KEY, newTheme)
      } catch {}
    },
    [],
  )

  useEffect(() => {
    applyTheme(resolvedTheme, attribute)
  }, [resolvedTheme, attribute])

  const ctx = useMemo(
    () => ({ theme, setTheme, resolvedTheme }),
    [theme, setTheme, resolvedTheme],
  )

  return (
    <ThemeContext.Provider value={ctx}>
      {disableTransitionOnChange && mounted ? (
        <style
          dangerouslySetInnerHTML={{
            __html: `*,*::before,*::after{transition:none!important}`,
          }}
        />
      ) : null}
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
