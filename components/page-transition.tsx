"use client"

import { useEffect, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    setIsTransitioning(true)
    const timer = setTimeout(() => setIsTransitioning(false), 200)
    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <div
      className={`transition-opacity duration-200 ${
        isTransitioning ? "opacity-0" : "opacity-100"
      }`}
    >
      {children}
    </div>
  )
}
