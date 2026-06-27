"use client"

import { usePathname, useRouter } from "next/navigation"
import { motion } from "motion/react"
import { Home, Dumbbell, Apple, ClipboardCheck, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

const tabs = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/workout", label: "Workout", icon: Dumbbell },
  { href: "/nutrition", label: "Nutrition", icon: Apple },
  { href: "/checkin", label: "Check-in", icon: ClipboardCheck },
  { href: "/progress", label: "Progress", icon: TrendingUp },
]

export default function ClientBottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#111111] border-t border-[#222222] z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <motion.button
              key={href}
              onClick={() => router.push(href)}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-14 h-full transition-colors",
                isActive ? "text-[#C9A84C]" : "text-[#555555]"
              )}
            >
              <Icon className="size-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}
