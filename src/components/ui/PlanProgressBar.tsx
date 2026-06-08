"use client"

import { cn } from "@/lib/utils"

interface PlanProgressBarProps {
  current: number
  total: number
  className?: string
}

export function PlanProgressBar({ current, total, className }: PlanProgressBarProps) {
  const pct = Math.round((current / total) * 100)

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400">{current} days remaining</span>
        <span className="text-purple-light font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-purple transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
