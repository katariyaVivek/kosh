"use client"

import { useEffect, useState } from "react"
import { Confetti } from "@/components/confetti"

export function CelebrationListener() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const handleCelebrate = () => setActive(true)
    window.addEventListener("kosh:celebrate", handleCelebrate)
    return () => window.removeEventListener("kosh:celebrate", handleCelebrate)
  }, [])

  return <Confetti active={active} onComplete={() => setActive(false)} />
}
