"use client"

import { motion } from "motion/react"
import { Users, ClipboardCheck, IndianRupee, Plus } from "lucide-react"

const stats = [
  { label: "Active Clients", value: "0", icon: Users },
  { label: "Pending Check-ins", value: "0", icon: ClipboardCheck },
  { label: "Fees Due", value: "0", icon: IndianRupee },
  { label: "This Month", value: "₹0", icon: IndianRupee },
]

export default function CoachDashboardPage() {
  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            Good morning, Aman
          </h1>
          <p className="text-sm text-[#A0A0A0]">Let&apos;s check today&apos;s progress</p>
        </div>
        <div className="size-10 rounded-full bg-[#C9A84C] flex items-center justify-center">
          <span className="text-[#0A0A0A] text-sm font-bold">AK</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-[#161616] border border-[#222222] rounded-2xl p-4 space-y-2"
          >
            <stat.icon className="size-5 text-[#C9A84C]" />
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-[#A0A0A0]">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-[#161616] border border-[#222222] rounded-2xl p-8 text-center space-y-4">
        <div className="size-12 rounded-full bg-[#C9A84C]/10 flex items-center justify-center mx-auto">
          <Users className="size-6 text-[#C9A84C]" />
        </div>
        <div>
          <p className="text-white font-semibold">Add your first client</p>
          <p className="text-sm text-[#A0A0A0] mt-1">Get started by adding a client to your roster</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-2 h-12 px-6 rounded-2xl bg-[#C9A84C] text-[#0A0A0A] font-semibold text-sm mx-auto"
        >
          <Plus className="size-5" />
          Add Client
        </motion.button>
      </div>
    </div>
  )
}
