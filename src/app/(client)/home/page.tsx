"use client"

import { motion } from "motion/react"
import { Dumbbell, Apple } from "lucide-react"

export default function ClientHomePage() {
  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            Good morning
          </h1>
          <p className="text-sm text-[#A0A0A0]">Week 1</p>
        </div>
        <div className="size-10 rounded-full bg-[#C9A84C] flex items-center justify-center">
          <span className="text-[#0A0A0A] text-sm font-bold">AK</span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#161616] border border-[#222222] rounded-2xl p-5 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Dumbbell className="size-5 text-[#C9A84C]" />
          <h2 className="text-white font-semibold">Today&apos;s Workout</h2>
        </div>
        <div className="h-20 rounded-xl bg-[#111111] border border-[#222222] flex items-center justify-center">
          <p className="text-sm text-[#A0A0A0]">No plan assigned yet</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#161616] border border-[#222222] rounded-2xl p-5 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Apple className="size-5 text-[#C9A84C]" />
          <h2 className="text-white font-semibold">Nutrition Summary</h2>
        </div>
        <div className="h-20 rounded-xl bg-[#111111] border border-[#222222] flex items-center justify-center">
          <p className="text-sm text-[#A0A0A0]">No nutrition plan yet</p>
        </div>
      </motion.div>
    </div>
  )
}
