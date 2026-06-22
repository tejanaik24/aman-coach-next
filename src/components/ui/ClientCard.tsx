"use client"

import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import { PlanProgressBar } from "./PlanProgressBar"

interface ClientCardProps {
  name: string
  email?: string
  plan?: string
  status: "active" | "paused" | "inactive"
  daysRemaining?: number
  totalDays?: number
  onClick?: () => void
}

const statusColors = {
  active: "bg-green-500",
  paused: "bg-yellow-500",
  inactive: "bg-red-500",
}

export function ClientCard({ name, email, plan, status, daysRemaining, totalDays, onClick }: ClientCardProps) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 cursor-pointer transition-colors hover:border-[#FFB800]/30"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="size-10 rounded-full bg-[#FFB800]/20 flex items-center justify-center">
          <span className="font-heading text-sm text-[#FFD200]">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{name}</p>
          {email && <p className="text-xs text-zinc-500 truncate">{email}</p>}
        </div>
        <div className={cn("size-2.5 rounded-full", statusColors[status])} />
      </div>
      {plan && (
        <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2">{plan}</p>
      )}
      {daysRemaining !== undefined && totalDays && (
        <PlanProgressBar current={daysRemaining} total={totalDays} />
      )}
    </motion.div>
  )
}
