"use client"

import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface CheckinCardProps {
  date: Date
  weight?: number
  energy?: number
  sleep?: number
  mood?: number
  notes?: string
  className?: string
}

const energyEmoji = (v?: number) => {
  if (!v) return "—"
  if (v <= 2) return "😫"
  if (v <= 4) return "😐"
  if (v <= 6) return "🙂"
  if (v <= 8) return "💪"
  return "🔥"
}

export function CheckinCard({ date, weight, energy, sleep, notes, className }: CheckinCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className={cn(
        "rounded-2xl border border-zinc-800 bg-zinc-900 p-4",
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-500 font-medium">
          {format(new Date(date), "EEE, MMM d")}
        </span>
        <span className="text-lg">{energyEmoji(energy)}</span>
      </div>
      <div className="flex gap-4 text-sm">
        {weight && (
          <div>
            <span className="text-zinc-500 text-xs">Weight</span>
            <p className="text-white font-medium">{weight} kg</p>
          </div>
        )}
        {sleep && (
          <div>
            <span className="text-zinc-500 text-xs">Sleep</span>
            <p className="text-white font-medium">{sleep}/5</p>
          </div>
        )}
      </div>
      {notes && (
        <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{notes}</p>
      )}
    </motion.div>
  )
}
