"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Users, ClipboardCheck, Settings, MessageSquare, CheckSquare, FileText } from "lucide-react"

const coachLinks = [
  { href: "/coach/clients", label: "Clients", icon: Users },
  { href: "/coach/checkins", label: "Check-ins", icon: ClipboardCheck },
  { href: "/coach/forms", label: "Forms", icon: FileText },
  { href: "/coach/messages", label: "Chat", icon: MessageSquare },
  { href: "/coach/admin", label: "More", icon: Settings },
]

export function CoachBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800 bg-black/95 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-lg justify-around px-2 py-1">
        {coachLinks.map((link) => {
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
