"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const clientLinks = [
  { href: "/client/dashboard", label: "Home", icon: "▦" },
  { href: "/client/workout", label: "Workout", icon: "⚔" },
  { href: "/client/diet", label: "Diet", icon: "◈" },
  { href: "/client/checkin", label: "Check-in", icon: "◉" },
  { href: "/client/payments", label: "Pay", icon: "₨" },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg justify-around px-2 py-2">
        {clientLinks.map((link) => {
          const active = pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors",
                active ? "text-gold" : "text-white/40 hover:text-white/70"
              )}
            >
              <span className="text-lg">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
