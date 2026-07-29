"use client"

import { usePathname, useRouter } from "next/navigation"
import { motion } from "motion/react"
import { Home, Dumbbell, Utensils, TrendingUp, MoreHorizontal } from "lucide-react"

const tabs = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/workout", label: "Workout", icon: Dumbbell },
  { href: "/diet", label: "Diet", icon: Utensils },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/checkin", label: "Check-in", icon: MoreHorizontal },
]

export default function ClientBottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav className="fixed bottom-4 left-4 right-4 max-w-[398px] mx-auto bg-bg-surface/90 backdrop-blur-xl border border-border-subtle rounded-full p-2 flex justify-between items-center shadow-[0_0_30px_rgba(255,106,26,0.08)] z-50 select-none">
      {tabs.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/")
        return (
          <button
            key={href}
            onClick={() => router.push(href)}
            className="flex-1 relative flex flex-col items-center justify-center py-2 text-xs font-semibold focus:outline-none cursor-pointer"
          >
            {isActive && (
              <motion.div
                layoutId="client-active-pill"
                className="absolute inset-0 bg-accent-orange/15 border border-accent-orange/30 rounded-full"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span
              className={`relative z-10 flex flex-col items-center gap-1 transition-colors duration-300 ${
                isActive ? "text-accent-orange" : "text-text-muted"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] tracking-tight">{label}</span>
            </span>
          </button>
        )
      })}
    </nav>
  )
}
