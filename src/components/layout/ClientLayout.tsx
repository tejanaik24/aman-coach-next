"use client"

import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"
import { BottomNav } from "./BottomNav"
import { ReactNode } from "react"

export function ClientLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Link href="/client/dashboard" className="font-heading text-base text-gold">
            AK FITNESS
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40 truncate max-w-24">{user?.displayName}</span>
            <button
              onClick={logout}
              className="rounded-md border border-white/10 px-3 py-1 text-xs text-white/50 transition-colors hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  )
}
