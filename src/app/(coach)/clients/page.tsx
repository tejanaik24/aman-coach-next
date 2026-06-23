"use client"

import { motion } from "motion/react"
import { Users, Plus } from "lucide-react"

export default function ClientsPage() {
  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
          Clients
        </h1>
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="size-10 rounded-xl bg-[#C9A84C] flex items-center justify-center"
        >
          <Plus className="size-5 text-[#0A0A0A]" />
        </motion.button>
      </div>

      <div className="bg-[#161616] border border-[#222222] rounded-2xl p-8 text-center space-y-3">
        <div className="size-12 rounded-full bg-[#C9A84C]/10 flex items-center justify-center mx-auto">
          <Users className="size-6 text-[#C9A84C]" />
        </div>
        <p className="text-white font-semibold">No clients yet</p>
        <p className="text-sm text-[#A0A0A0]">Add your first client to get started</p>
      </div>
    </div>
  )
}
