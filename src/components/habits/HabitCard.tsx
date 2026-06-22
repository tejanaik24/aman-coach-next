"use client"

import { motion } from "motion/react"
import { cn } from "@/lib/utils"

interface Props {
  name: string
  icon: string
  color: string
  done: boolean
  streak: number
  onToggle: () => void
  loading?: boolean
}

export function HabitCard({ name, icon, color, done, streak, onToggle, loading }: Props) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      disabled={loading}
      className={cn(
        "rounded-2xl border p-4 text-left w-full transition-all",
        done
          ? "border-[#FFB800]/30 bg-gradient-to-br from-[#FFB800]/10 to-transparent"
          : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {done ? (
          <motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="size-6"
            viewBox="0 0 24 24"
            fill="none"
          >
            <motion.circle
              cx="12" cy="12" r="10"
              fill="#FFB800"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
            />
            <motion.path
              d="M8 12l3 3 5-5"
              stroke="white"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.1 }}
            />
          </motion.svg>
        ) : (
          <div className="size-6 rounded-full border-2 border-zinc-700" />
        )}
      </div>
      <p className={cn(
        "text-sm font-medium mb-1",
        done ? "text-[#FFD200]" : "text-white"
      )}>
        {name}
      </p>
      {streak > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-xs">🔥</span>
          <span className="text-xs text-zinc-500">{streak} day{streak > 1 ? "s" : ""}</span>
        </div>
      )}
    </motion.button>
  )
}
