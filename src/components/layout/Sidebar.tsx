"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"

const coachLinks = [
  { href: "/coach/admin", label: "Dashboard", icon: "▦" },
  { href: "/coach/clients", label: "Clients", icon: "◉" },
  { href: "/coach/plans", label: "Plans", icon: "◈" },
  { href: "/coach/checkins", label: "Check-ins", icon: "◉" },
  { href: "/coach/payments", label: "Payments", icon: "₨" },
  { href: "/coach/leads", label: "Leads", icon: "○" },
  { href: "/coach/analytics", label: "Analytics", icon: "▤" },
  { href: "/coach/broadcast", label: "Broadcast", icon: "☰" },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-56 border-r border-white/10 bg-black/95 backdrop-blur-md lg:block">
      <div className="flex h-16 items-center border-b border-white/10 px-4">
        <Link href="/" className="font-heading text-lg text-gold">
          AK FITNESS
        </Link>
      </div>
      <nav className="space-y-1 p-3">
        {coachLinks.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + "/")
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-gold/10 text-gold"
                  : "text-white/50 hover:bg-white/5 hover:text-white/80"
              )}
            >
              <span className="text-lg">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="absolute bottom-4 left-3 right-3 border-t border-white/10 pt-3">
        <div className="px-3 text-xs text-white/30 truncate">
          {user?.email}
        </div>
      </div>
    </aside>
  )
}
