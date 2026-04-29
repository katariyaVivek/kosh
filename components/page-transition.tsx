"use client"

import { useEffect, useState, useRef, type ReactNode } from "react"
import { usePathname } from "next/navigation"

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [state, setState] = useState<"entering" | "idle" | "exiting">("idle")
  const prevPath = useRef(pathname)

  useEffect(() => {
    if (prevPath.current !== pathname) {
      setState("exiting")
      const exitTimer = setTimeout(() => {
        prevPath.current = pathname
        setState("entering")
        const enterTimer = setTimeout(() => setState("idle"), 400)
        return () => clearTimeout(enterTimer)
      }, 200)
      return () => clearTimeout(exitTimer)
    } else {
      setState("entering")
      const timer = setTimeout(() => setState("idle"), 400)
      return () => clearTimeout(timer)
    }
  }, [pathname])

  return (
    <div
      className="transition-all ease-out will-change-transform"
      style={{
        transitionDuration: state === "idle" ? "400ms" : "200ms",
        opacity: state === "exiting" ? 0 : 1,
        transform:
          state === "exiting"
            ? "translateY(-4px) scale(0.995)"
            : state === "entering"
              ? "translateY(4px) scale(0.998)"
              : "translateY(0) scale(1)",
      }}
    >
      {children}
    </div>
  )
}
