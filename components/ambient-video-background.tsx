"use client"

import { useEffect, useRef, useState } from "react"
import Hls from "hls.js"

const VIDEO_URL =
  "https://stream.mux.com/Si6ej2ZRrxRCnTYBXSScDRCdd7CGnyTqiPszZcw3z4I.m3u8"

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function AmbientVideoBackground() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const video = videoRef.current

    if (!video || prefersReducedMotion()) {
      return
    }

    let hls: Hls | null = null

    const startPlayback = async () => {
      try {
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = VIDEO_URL
        } else if (Hls.isSupported()) {
          hls = new Hls({ enableWorker: true, lowLatencyMode: false })
          hls.loadSource(VIDEO_URL)
          hls.attachMedia(video)
        } else {
          return
        }

        await video.play()
        setIsReady(true)
      } catch {
        setIsReady(false)
      }
    }

    startPlayback()

    return () => {
      hls?.destroy()
      video.pause()
      video.removeAttribute("src")
      video.load()
    }
  }, [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background"
    >
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="metadata"
        className={[
          "h-full w-full object-cover transition-opacity duration-700",
          isReady ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />
      <div className="absolute inset-0 bg-background/80 backdrop-blur-[1px] dark:bg-background/82" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--background)_0%,hsl(222_34%_6%_/_0.54)_34%,var(--background)_100%)] opacity-35 dark:opacity-55" />
      <div className="absolute inset-x-0 top-0 h-72 bg-[linear-gradient(to_bottom,hsl(188_95%_43%_/_0.18),transparent)]" />
    </div>
  )
}
