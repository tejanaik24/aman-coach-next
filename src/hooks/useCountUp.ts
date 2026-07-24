"use client"

import { useEffect, useRef, useState } from "react"
import { gsap } from "gsap"

/** GSAP-driven count-up from 0 to `value`, replays whenever `value` changes. */
export function useCountUp(value: number, duration = 1.2): number {
  const [display, setDisplay] = useState(0)
  const proxy = useRef({ val: 0 })

  useEffect(() => {
    const obj = proxy.current
    const tween = gsap.to(obj, {
      val: value,
      duration,
      ease: "power2.out",
      onUpdate: () => setDisplay(Math.round(obj.val)),
    })
    return () => { tween.kill() }
  }, [value, duration])

  return display
}
