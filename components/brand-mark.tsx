"use client"

import Image from "next/image"

import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

type BrandMarkProps = {
  alt?: string
  className?: string
  fill?: boolean
  height?: number
  priority?: boolean
  sizes?: string
  width?: number
}

export function BrandMark({
  alt = "Kosh logo",
  className,
  fill = false,
  height,
  priority = false,
  sizes,
  width,
}: BrandMarkProps) {
  const { resolvedTheme } = useTheme()

  const src =
    resolvedTheme === "light"
      ? "/branding/kosh-mark-light.png"
      : "/branding/kosh-mark-dark.png"

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={cn("object-contain", className)}
        priority={priority}
      />
    )
  }

  if (!width || !height) {
    throw new Error("BrandMark requires width and height when fill is false")
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn("object-contain", className)}
      priority={priority}
    />
  )
}
