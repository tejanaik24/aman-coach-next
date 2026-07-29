"use client"

import { useEffect, useState } from "react"

export function SignedImage({ path, alt, className }: { path: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setUrl(null)
    fetch(`/api/checkin/photo-url?path=${encodeURIComponent(path)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.url) setUrl(data.url)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [path])

  if (!url) {
    return <div className={`${className || ""} bg-[#181310]/5 animate-pulse`} />
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} />
}
