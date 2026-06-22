"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { ClientLayout } from "@/components/layout/ClientLayout"
import {
  ClipboardCheck, BarChart3, User, Heart, CalendarDays, Activity,
} from "lucide-react"

const tiles = [
  { href: "/client/checkin", label: "Check-in", icon: ClipboardCheck, desc: "Weekly progress", color: "from-[#FFB800]/20 to-[#FFB800]/5", iconColor: "text-[#FFD200]" },
  { href: "/client/progress", label: "Progress", icon: BarChart3, desc: "Charts & history", color: "from-blue-500/20 to-blue-500/5", iconColor: "text-blue-400" },
  { href: "/client/wellness", label: "Wellness", icon: Activity, desc: "Steps, HR, sleep", color: "from-green-500/20 to-green-500/5", iconColor: "text-green-400" },
  { href: "/client/schedule", label: "Schedule", icon: CalendarDays, desc: "Book sessions", color: "from-orange-500/20 to-orange-500/5", iconColor: "text-orange-400" },
  { href: "/client/messages", label: "Messages", icon: Heart, desc: "Chat with coach", color: "from-pink-500/20 to-pink-500/5", iconColor: "text-pink-400" },
  { href: "/client/profile", label: "Profile", icon: User, desc: "Settings & plan", color: "from-cyan-500/20 to-cyan-500/5", iconColor: "text-cyan-400" },
]

export default function MorePage() {
  return (
    <ClientLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pt-2"
      >
        <h1 className="font-heading text-2xl text-white mb-1">More</h1>
        <p className="text-sm text-zinc-500 mb-6">All tools &amp; features</p>
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((tile, i) => {
            const Icon = tile.icon
            return (
              <motion.div
                key={tile.href}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <Link href={tile.href}>
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className={`rounded-2xl border border-zinc-800 bg-gradient-to-br ${tile.color} p-5 h-full transition-colors hover:border-[#FFB800]/30`}
                  >
                    <div className={`size-11 rounded-xl bg-zinc-800 flex items-center justify-center mb-3 ${tile.iconColor}`}>
                      <Icon className="size-5" />
                    </div>
                    <p className="text-sm font-medium text-white mb-0.5">{tile.label}</p>
                    <p className="text-xs text-zinc-500">{tile.desc}</p>
                  </motion.div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </ClientLayout>
  )
}
