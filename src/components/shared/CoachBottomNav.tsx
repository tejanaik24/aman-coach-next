"use client"

import { usePathname, useRouter } from "next/navigation"
import { motion } from "motion/react"
import { LayoutDashboard, Users, CalendarRange, ClipboardCheck, Wallet, FileText } from "lucide-react"

const tabs = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/submissions", label: "Forms", icon: FileText },
  { href: "/checkins", label: "Check-ins", icon: ClipboardCheck },
  { href: "/fees", label: "Fees", icon: Wallet },
]

export default function CoachBottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav className="fixed bottom-4 left-4 right-4 max-w-[398px] mx-auto bg-bg-surface/90 backdrop-blur-xl border border-border-subtle rounded-full p-2 flex justify-between items-center shadow-[0_0_30px_rgba(255,184,0,0.08)] z-50 select-none">
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
                layoutId="coach-active-pill"
                className="absolute inset-0 bg-accent-gold/15 border border-accent-gold/30 rounded-full"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span
              className={`relative z-10 flex flex-col items-center gap-1 transition-colors duration-300 ${
                isActive ? "text-accent-gold" : "text-text-muted"
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
