"use client"

import { useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface ImageWithFallbackProps {
  src: string
  alt: string
  className?: string
  fill?: boolean
  width?: number
  height?: number
}

export function ImageWithFallback({ src, alt, className, fill, width, height }: ImageWithFallbackProps) {
  const [error, setError] = useState(false)

  if (error || !src) {
    return (
      <div className={cn("bg-gradient-to-br from-zinc-900 to-zinc-800 flex items-center justify-center", className)}>
        <div className="text-center">
          <div className="size-12 rounded-full bg-[#FFB800]/20 flex items-center justify-center mx-auto mb-2">
            <span className="text-2xl">💪</span>
          </div>
          <p className="text-xs text-zinc-500">{alt}</p>
        </div>
      </div>
    )
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={cn("object-cover", className)}
        onError={() => setError(true)}
      />
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setError(true)}
    />
  )
}
