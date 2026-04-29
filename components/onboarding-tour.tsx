"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronRight, X, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type TourStep = {
  target: string
  title: string
  description: ReactNode
  placement?: "bottom" | "top" | "left" | "right" | "center"
}

const STORAGE_KEY = "kosh-onboarding-complete"

const TOUR_STEPS: TourStep[] = [
  {
    target: "[data-tour='dashboard']",
    title: "Welcome to Kosh",
    description: "Your local-first API key treasury. Everything stays on your machine — zero telemetry.",
    placement: "center",
  },
  {
    target: "[data-tour='sidebar']",
    title: "Navigation",
    description: "Jump between Dashboard, Vault, Pulse, Alerts, and Settings from here.",
    placement: "right",
  },
  {
    target: "[data-tour='add-key']",
    title: "Add your first key",
    description: "Click this button (or press N) to add a new API key. Keys are encrypted at rest with AES-256.",
    placement: "right",
  },
  {
    target: "[data-tour='key-table']",
    title: "Key overview",
    description: "See all your keys at a glance with status indicators. Click any key to see usage details.",
    placement: "top",
  },
  {
    target: "[data-tour='health-check']",
    title: "Health Check",
    description: "Validate all your keys at once to make sure they're still active. Or press H.",
    placement: "top",
  },
  {
    target: "[data-tour='search']",
    title: "Search & filter",
    description: "Quickly find keys by name, platform, or project. Press / to focus the search.",
    placement: "top",
  },
  {
    target: "[data-tour='shortcuts']",
    title: "Keyboard shortcuts",
    description: (
      <div className="space-y-1">
        <div><kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">N</kbd> New key</div>
        <div><kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">/</kbd> Focus search</div>
        <div><kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">H</kbd> Health check</div>
        <div><kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">L</kbd> Lock vault</div>
      </div>
    ),
    placement: "top",
  },
]

function getTargetRect(target: string): DOMRect | null {
  try {
    const el = document.querySelector(target)
    if (!el) return null
    return el.getBoundingClientRect()
  } catch {
    return null
  }
}

export function OnboardingTour() {
  const [step, setStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const overlayRef = useRef<HTMLDivElement>(null)

  // Check if this is first visit
  useEffect(() => {
    const hasCompleted = localStorage.getItem(STORAGE_KEY)
    if (!hasCompleted) {
      // Delay slightly to let page render
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const positionTooltip = useCallback((currentStep: number) => {
    const stepConfig = TOUR_STEPS[currentStep]
    if (stepConfig.placement === "center") {
      setHighlightRect(null)
      setTooltipPos({
        top: window.innerHeight / 2 - 80,
        left: window.innerWidth / 2 - 180,
      })
      return
    }

    const rect = getTargetRect(stepConfig.target)
    if (!rect) return

    setHighlightRect(rect)

    const tooltipWidth = 360
    const tooltipHeight = 180
    const padding = 16

    let top = 0
    let left = 0

    switch (stepConfig.placement) {
      case "bottom":
        top = rect.bottom + padding
        left = rect.left + rect.width / 2 - tooltipWidth / 2
        break
      case "top":
        top = rect.top - tooltipHeight - padding
        left = rect.left + rect.width / 2 - tooltipWidth / 2
        break
      case "left":
        top = rect.top + rect.height / 2 - tooltipHeight / 2
        left = rect.left - tooltipWidth - padding
        break
      case "right":
        top = rect.top + rect.height / 2 - tooltipHeight / 2
        left = rect.right + padding
        break
    }

    // Clamp to viewport
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16))
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16))

    setTooltipPos({ top, left })
  }, [])

  // Update position on step change and resize
  useEffect(() => {
    if (!isVisible) return
    positionTooltip(step)

    const handleResize = () => positionTooltip(step)
    window.addEventListener("resize", handleResize)
    const interval = setInterval(() => positionTooltip(step), 200)
    return () => {
      window.removeEventListener("resize", handleResize)
      clearInterval(interval)
    }
  }, [step, isVisible, positionTooltip])

  const handleNext = useCallback(() => {
    if (step < TOUR_STEPS.length - 1) {
      setStep((s) => s + 1)
    } else {
      handleComplete()
    }
  }, [step])

  const handleComplete = useCallback(() => {
    setIsVisible(false)
    localStorage.setItem(STORAGE_KEY, "true")
  }, [])

  const handleSkip = useCallback(() => {
    setIsVisible(false)
    localStorage.setItem(STORAGE_KEY, "true")
  }, [])

  if (!isVisible) return null

  const currentStep = TOUR_STEPS[step]
  const isLastStep = step === TOUR_STEPS.length - 1

  return (
    <>
      {/* Dim overlay */}
      <div
        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-[1px]"
        onClick={handleSkip}
      />

      {/* Highlight box */}
      {highlightRect && (
        <div
          className="fixed z-[9999] rounded-xl border-2 border-primary/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] pointer-events-none animate-pulse"
          style={{
            top: highlightRect.top - 4,
            left: highlightRect.left - 4,
            width: highlightRect.width + 8,
            height: highlightRect.height + 8,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={overlayRef}
        className={cn(
          "fixed z-[10000] w-full max-w-sm rounded-2xl border border-border/80 bg-card p-5 shadow-2xl",
          "animate-in fade-in duration-200"
        )}
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {step + 1}
              </span>
              <h3 className="text-sm font-semibold text-foreground">
                {currentStep.title}
              </h3>
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed">
              {currentStep.description}
            </div>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Skip tour"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="mt-4 mb-4 flex items-center gap-1">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-xs text-muted-foreground"
          >
            Skip tour
          </Button>
          <Button
            size="sm"
            onClick={handleNext}
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isLastStep ? "Get started" : "Next"}
            {isLastStep ? (
              <ArrowRight className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
          </Button>
        </div>
      </div>
    </>
  )
}
