"use client"

import { useEffect, useRef } from "react"

type Particle = {
  x: number
  y: number
  color: string
  velocity: { x: number; y: number }
  size: number
  rotation: number
  rotationSpeed: number
}

type ConfettiProps = {
  active: boolean
  onComplete: () => void
}

const COLORS = [
  "#6366f1", // Indigo (Primary)
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#3b82f6", // Blue
  "#ec4899", // Pink
]

export function Confetti({ active, onComplete }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Resize canvas to window size
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: Particle[] = []
    const particleCount = 150

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        velocity: {
          x: (Math.random() - 0.5) * 15,
          y: (Math.random() - 0.5) * 15,
        },
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
      })
    }

    particlesRef.current = particles

    let frame = 0
    const maxFrames = 120 // ~2 seconds at 60fps

    const animate = () => {
      frame++
      if (frame > maxFrames) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        onComplete()
        return
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p) => {
        p.x += p.velocity.x
        p.y += p.velocity.y
        p.velocity.y += 0.2 // Gravity
        p.velocity.x *= 0.96 // Air resistance
        p.rotation += p.rotationSpeed

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.globalAlpha = Math.max(0, 1 - frame / maxFrames)
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
        ctx.restore()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [active, onComplete])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[100]"
      style={{ width: "100%", height: "100%" }}
    />
  )
}
