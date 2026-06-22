"use client"

import { motion } from "motion/react"

interface Macro {
  label: string
  current: number
  target: number
  color: string
  unit: string
}

interface Props {
  macros: Macro[]
}

export function MacroBar({ macros }: Props) {
  const maxTarget = Math.max(...macros.map((m) => m.target), 1)

  return (
    <div className="space-y-3">
      {macros.map((macro, i) => {
        const ratio = Math.min(macro.current / macro.target, 1)
        return (
          <motion.div
            key={macro.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="size-2.5 rounded-full" style={{ backgroundColor: macro.color }} />
                <span className="text-xs text-zinc-400 font-medium">{macro.label}</span>
              </div>
              <span className="text-xs text-zinc-500">
                <span className="text-white font-medium">{Math.round(macro.current)}</span>
                /{macro.target}{macro.unit}
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: macro.color }}
                initial={{ width: 0 }}
                animate={{ width: `${ratio * 100}%` }}
                transition={{ duration: 1, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
