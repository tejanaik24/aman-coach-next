"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { LayoutDashboard, Users, ClipboardList, ClipboardCheck, IndianRupee, Users2, BarChart3, Send, CalendarDays, Clock, MessageSquare, CheckSquare, FileText } from "lucide-react"

const coachLinks = [
  { href: "/coach/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/coach/clients", label: "Clients", icon: Users },
  { href: "/coach/forms", label: "Intake Forms", icon: FileText },
  { href: "/coach/plans", label: "Plans", icon: ClipboardList },
  { href: "/coach/checkins", label: "Check-ins", icon: ClipboardCheck },
  { href: "/coach/todo", label: "To-Do", icon: CheckSquare },
  { href: "/coach/messages", label: "Messages", icon: MessageSquare },
  { href: "/coach/payments", label: "Payments", icon: IndianRupee },
  { href: "/coach/leads", label: "Leads", icon: Users2 },
  { href: "/coach/availability", label: "Availability", icon: Clock },
  { href: "/coach/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/coach/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/coach/broadcast", label: "Broadcast", icon: Send },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-56 border-r border-zinc-800 bg-black/95 backdrop-blur-md lg:block">
      <div className="flex h-14 items-center border-b border-zinc-800 px-4">
        <Link href="/" className="font-heading text-lg text-white tracking-wider">
          AK FITNESS
        </Link>
      </div>
      <nav className="space-y-1 p-3">
        {coachLinks.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + "/")
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-[rgba(255,184,0,0.1)] text-[#FFB800]"
                  : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
              )}
            >
              <Icon className="size-4" />
              <span>{link.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="absolute bottom-4 left-3 right-3 border-t border-zinc-800 pt-3">
        <div className="px-3 text-xs text-zinc-500 truncate">
          {user?.email}
        </div>
      </div>
    </aside>
  )
}
