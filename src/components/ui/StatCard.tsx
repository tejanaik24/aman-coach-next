"use client"

import { motion } from "motion/react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  icon: string
  value: string
  label: string
  className?: string
}

export function StatCard({ icon, value, label, className }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        "min-w-[120px] rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-sm",
        className
      )}
    >
      <p className="text-2xl mb-1">{icon}</p>
      <p className="font-heading text-xl text-white">{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </motion.div>
  )
}
