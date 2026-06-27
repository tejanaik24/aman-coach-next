"use client"

import { usePathname, useRouter } from "next/navigation"
import { motion } from "motion/react"
import { LayoutDashboard, Users, Dumbbell, IndianRupee } from "lucide-react"
import { cn } from "@/lib/utils"

const tabs = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/plans", label: "Plans", icon: Dumbbell },
  { href: "/fees", label: "Fees", icon: IndianRupee },
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
              className="flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors relative"
            >
              <Icon
                className={cn(
                  "size-5 transition-colors",
                  isActive ? "text-[#C9A84C]" : "text-[#555555]"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive ? "text-[#C9A84C]" : "text-[#555555]"
                )}
              >
                {label}
              </span>
              {/* Active dot indicator */}
              <div
                className={cn(
                  "w-1 h-1 rounded-full transition-colors",
                  isActive ? "bg-[#C9A84C]" : "bg-transparent"
                )}
              />
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}
