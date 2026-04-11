"use client"

import { useEffect, useRef } from "react"

export function HeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number
    let time = 0

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      canvas.width = parent.clientWidth * window.devicePixelRatio
      canvas.height = parent.clientHeight * window.devicePixelRatio
      canvas.style.width = `${parent.clientWidth}px`
      canvas.style.height = `${parent.clientHeight}px`
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    resize()
    window.addEventListener("resize", resize)

    // Mesh gradient blobs
    const blobs = [
      { x: 0.2, y: 0.3, r: 0.5, color: "hsla(239, 84%, 67%, 0.15)", vx: 0.0003, vy: 0.0002 },
      { x: 0.7, y: 0.6, r: 0.4, color: "hsla(240, 78%, 54%, 0.12)", vx: -0.0002, vy: 0.0003 },
      { x: 0.5, y: 0.8, r: 0.45, color: "hsla(260, 80%, 65%, 0.10)", vx: 0.0004, vy: -0.0002 },
      { x: 0.85, y: 0.2, r: 0.35, color: "hsla(239, 84%, 97%, 0.08)", vx: -0.0003, vy: 0.0001 },
    ]

    const draw = () => {
      const w = canvas.width / window.devicePixelRatio
      const h = canvas.height / window.devicePixelRatio

      ctx.clearRect(0, 0, w, h)

      for (const blob of blobs) {
        blob.x += blob.vx
        blob.y += blob.vy

        // Wrap around
        if (blob.x > 1.3) blob.x = -0.3
        if (blob.x < -0.3) blob.x = 1.3
        if (blob.y > 1.3) blob.y = -0.3
        if (blob.y < -0.3) blob.y = 1.3

        const cx = blob.x * w
        const cy = blob.y * h
        const radius = blob.r * Math.max(w, h)

        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
        gradient.addColorStop(0, blob.color)
        gradient.addColorStop(1, "transparent")

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, w, h)
      }

      time += 0.01
      animationId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 opacity-60"
      aria-hidden="true"
    />
  )
}
