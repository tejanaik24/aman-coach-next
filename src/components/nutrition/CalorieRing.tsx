"use client"

import { motion } from "motion/react"

interface Props {
  current: number
  target: number
  size?: number
  strokeWidth?: number
}

export function CalorieRing({ current, target, size = 160, strokeWidth = 12 }: Props) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const ratio = Math.min(current / target, 1)
  const offset = circumference * (1 - ratio)
  const remaining = Math.max(target - current, 0)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(39 39 42)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#calorieGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
        <defs>
          <linearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFB800" />
            <stop offset="100%" stopColor="#FFD200" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={Math.round(current)}
          initial={{ scale: 1.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="font-heading text-3xl text-white"
        >
          {Math.round(current)}
        </motion.span>
        <span className="text-xs text-zinc-500">of {target} kcal</span>
        {remaining > 0 && (
          <span className="text-[10px] text-zinc-600 mt-0.5">{Math.round(remaining)} remaining</span>
        )}
      </div>
    </div>
  )
}
