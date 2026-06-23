"use client"

import { usePathname, useRouter } from "next/navigation"
import { motion } from "motion/react"
import { LayoutDashboard, Users, ClipboardList, IndianRupee } from "lucide-react"
import { cn } from "@/lib/utils"

const tabs = [
  { href: "/coach/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/coach/clients", label: "Clients", icon: Users },
  { href: "/coach/plans", label: "Plans", icon: ClipboardList },
  { href: "/coach/fees", label: "Fees", icon: IndianRupee },
]

export default function CoachBottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#111111] border-t border-[#222222] z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/")
          return (
            <motion.button
              key={href}
              onClick={() => router.push(href)}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors",
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
