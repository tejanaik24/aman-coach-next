// GSAP animation constants — durations, easings, stagger values used across the app.

export const EASE = {
  spring: "back.out(1.4)",
  smooth: "power3.out",
  entrance: "power4.out",
} as const

export const DURATION = {
  fast: 0.4,
  base: 0.8,
  slow: 1.4,
  kenBurns: 8,
} as const

export const STAGGER = {
  tight: 0.06,
  base: 0.12,
  loose: 0.2,
} as const
