"use client"

import { motion } from "motion/react"
import { cn } from "@/lib/utils"

interface Props {
  icon: React.ReactNode
  label: string
  value: string
  unit: string
  trend?: { value: number; positive: boolean }
  color: string
  onClick?: () => void
}

export function MetricCard({ icon, label, value, unit, trend, color, onClick }: Props) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-left w-full transition-colors hover:border-zinc-700"
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="size-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        {trend && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-0.5 text-xs font-medium ${
              trend.positive ? "text-green-400" : "text-red-400"
            }`}
          >
            <svg className="size-3" viewBox="0 0 24 24" fill="currentColor">
              {trend.positive ? (
                <path d="M12 4l8 12H4z" />
              ) : (
                <path d="M12 20l-8-12h16z" />
              )}
            </svg>
            {trend.value}%
          </motion.div>
        )}
      </div>
      <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="font-heading text-2xl text-white">{value}</span>
        <span className="text-xs text-zinc-500">{unit}</span>
      </div>
    </motion.button>
  )
}
