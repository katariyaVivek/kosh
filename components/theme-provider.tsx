"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
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
const THEME_ATTR = "data-theme"
const DARK_CLASS = "dark"

function getSystemTheme(): "dark" | "light" {
  if (typeof matchMedia === "undefined") return "light"
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "dark" || stored === "light" || stored === "system") {
      return stored
    }
  } catch {}
  return null
}

function applyTheme(theme: Theme, attribute: "class" | "data-theme") {
  const resolved = theme === "system" ? getSystemTheme() : theme
  const root = document.documentElement

  if (attribute === "class") {
    root.classList.toggle(DARK_CLASS, resolved === "dark")
  } else {
    root.setAttribute(THEME_ATTR, resolved)
  }
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  disableTransitionOnChange,
  attribute = "class",
}: ThemeProviderProps) {
  const id = useId()
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">(
    defaultTheme === "system" ? getSystemTheme() : defaultTheme,
  )
  const [mounted, setMounted] = useState(false)

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme)
      try {
        localStorage.setItem(STORAGE_KEY, newTheme)
      } catch {}
      applyTheme(newTheme, attribute)
    },
    [attribute],
  )

  useEffect(() => {
    const stored = getStoredTheme()
    const initial = stored ?? defaultTheme
    setThemeState(initial)
    applyTheme(initial, attribute)
    setMounted(true)
  }, [attribute, defaultTheme])

  useEffect(() => {
    if (theme !== "system") {
      setResolvedTheme(theme)
      return
    }
    const mq = matchMedia("(prefers-color-scheme: dark)")
    const handler = () => {
      const resolved = mq.matches ? "dark" : "light"
      setResolvedTheme(resolved)
      applyTheme("system", attribute)
    }
    mq.addEventListener("change", handler)
    handler()
    return () => mq.removeEventListener("change", handler)
  }, [theme, attribute])

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
