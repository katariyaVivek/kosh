"use client"

import { type ReactNode, useCallback, useRef, useState } from "react"

type RippleButtonProps = {
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
  type?: "button" | "submit" | "reset"
}

export function RippleButton({
  children,
  onClick,
  className = "",
  disabled = false,
  type = "button",
}: RippleButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = btnRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const id = Date.now()
      setRipples((prev) => [...prev, { x, y, id }])
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id))
      }, 600)

      onClick?.()
    },
    [onClick]
  )

  return (
    <button
      ref={btnRef}
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={`relative overflow-hidden ${className}`}
    >
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="pointer-events-none absolute rounded-full bg-current opacity-10 animate-ping"
          style={{
            left: ripple.x - 8,
            top: ripple.y - 8,
            width: 16,
            height: 16,
          }}
        />
      ))}
    </button>
  )
}
