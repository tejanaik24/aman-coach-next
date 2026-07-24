"use client"

import { useLayoutEffect, useRef, type RefObject } from "react"
import { gsap } from "gsap"
import { STAGGER, DURATION, EASE } from "@/lib/animations"

/**
 * Staggers the direct `.reveal-item` children of the returned ref on mount/data-ready.
 * Re-runs when `deps` changes (e.g. once loading flips to false and cards mount).
 */
export function useStaggerReveal<T extends HTMLElement>(deps: readonly unknown[] = []): RefObject<T | null> {
  const ref = useRef<T>(null)

  useLayoutEffect(() => {
    if (!ref.current) return
    const items = ref.current.querySelectorAll(".reveal-item")
    if (items.length === 0) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        items,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: DURATION.fast, stagger: STAGGER.base, ease: EASE.smooth }
      )
    })
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return ref
}
