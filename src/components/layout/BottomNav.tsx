"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, UtensilsCrossed, Dumbbell, CheckSquare, Grid3X3 } from "lucide-react"

const clientLinks = [
  { href: "/client/dashboard", label: "Home", icon: Home },
  { href: "/client/nutrition", label: "Nutrition", icon: UtensilsCrossed },
  { href: "/client/workout", label: "Workouts", icon: Dumbbell },
  { href: "/client/habits", label: "Habits", icon: CheckSquare },
  { href: "/client/more", label: "More", icon: Grid3X3 },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800 bg-black/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg justify-around px-2 py-1">
        {clientLinks.map((link) => {
          const active = pathname.startsWith(link.href)
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors",
                active ? "text-[#FFB800]" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Icon className={cn("size-5", active && "fill-[rgba(255,184,0,0.2)]")} />
              <span className="font-medium">{link.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
