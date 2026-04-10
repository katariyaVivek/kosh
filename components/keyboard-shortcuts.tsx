"use client"

import { useEffect, useRef } from "react"

type ShortcutHandler = (e: KeyboardEvent) => void

interface ShortcutConfig {
  key: string
  handler: ShortcutHandler
  ctrlKey?: boolean
  shiftKey?: boolean
  preventDefault?: boolean
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable

      for (const shortcut of shortcutsRef.current) {
        const matches =
          e.key === shortcut.key &&
          !!shortcut.ctrlKey === e.ctrlKey &&
          !!shortcut.shiftKey === e.shiftKey

        if (matches && !(isInput && !shortcut.ctrlKey)) {
          if (shortcut.preventDefault) e.preventDefault()
          shortcut.handler(e)
          return
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])
}
