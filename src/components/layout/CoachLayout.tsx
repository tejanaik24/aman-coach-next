"use client"

import { useAuth } from "@/hooks/useAuth"
import { Sidebar } from "./Sidebar"
import { ReactNode } from "react"

export function CoachLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-black text-white">
      <Sidebar />
      <div className="lg:ml-56">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-black/90 backdrop-blur-md">
          <div className="flex h-14 items-center justify-between px-4 lg:px-6">
            <h1 className="font-heading text-base text-gold lg:hidden">AK FITNESS</h1>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-white/40 hidden sm:block truncate max-w-32">
                {user?.email}
              </span>
              <button
                onClick={logout}
                className="rounded-md border border-white/10 px-3 py-1 text-xs text-white/50 transition-colors hover:text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </header>
        <main className="px-4 py-4 lg:px-6">{children}</main>
      </div>
    </div>
  )
}
