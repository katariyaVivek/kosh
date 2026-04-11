"use client"

import { useEffect, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    setIsTransitioning(true)
    const timer = setTimeout(() => setIsTransitioning(false), 300)
    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <div
      className="transition-opacity ease-out"
      style={{ transitionDuration: "300ms", opacity: isTransitioning ? 0 : 1 }}
    >
      {children}
    </div>
  )
}
