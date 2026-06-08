"use client"

import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"
import { BottomNav } from "./BottomNav"
import { ReactNode } from "react"
import { Bell } from "lucide-react"

export function ClientLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Link href="/client/dashboard" className="font-heading text-lg tracking-wider text-white">
            AK FITNESS
          </Link>
          <button className="relative text-zinc-400 hover:text-white transition-colors">
            <Bell className="size-5" />
            <span className="absolute -top-1 -right-1 size-2 rounded-full bg-purple" />
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  )
}
